'use client';

import { useState } from 'react';
import { Button, Text } from '@asn/ui';
import type { Address } from '@asn/types';
import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
} from '@/actions/addresses';
import { AddressForm, type AddressFormValues } from '../AddressForm/AddressForm';

type Mode = { type: 'list' } | { type: 'creating' } | { type: 'editing'; addressId: string };

export function AddressBook({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [mode, setMode] = useState<Mode>({ type: 'list' });
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleCreate(values: AddressFormValues) {
    const result = await createAddressAction(values);
    if (result.success) {
      setAddresses((prev) => withDefaultExclusive(prev, result.address));
      setMode({ type: 'list' });
      return { success: true };
    }
    return { success: false, message: result.message };
  }

  async function handleUpdate(addressId: string, values: AddressFormValues) {
    const result = await updateAddressAction(addressId, values);
    if (result.success) {
      setAddresses((prev) =>
        withDefaultExclusive(
          prev.map((a) => (a.id === addressId ? result.address : a)),
          result.address,
        ),
      );
      setMode({ type: 'list' });
      return { success: true };
    }
    return { success: false, message: result.message };
  }

  async function handleSetDefault(addressId: string) {
    setPendingId(addressId);
    try {
      const result = await setDefaultAddressAction(addressId);
      if (result.success) {
        setAddresses((prev) => withDefaultExclusive(prev, result.address));
      }
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(addressId: string) {
    setPendingId(addressId);
    try {
      const result = await deleteAddressAction(addressId);
      if (result.success) {
        setAddresses((prev) => prev.filter((a) => a.id !== addressId));
      }
    } finally {
      setPendingId(null);
    }
  }

  if (mode.type === 'creating') {
    return <AddressForm onSubmit={handleCreate} onCancel={() => setMode({ type: 'list' })} />;
  }

  if (mode.type === 'editing') {
    const editing = addresses.find((a) => a.id === mode.addressId);
    if (editing) {
      return (
        <AddressForm
          initialValues={editing}
          onSubmit={(values) => handleUpdate(mode.addressId, values)}
          onCancel={() => setMode({ type: 'list' })}
        />
      );
    }
  }

  if (addresses.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Text tone="muted">Você ainda não tem endereços salvos.</Text>
        <Button type="button" onClick={() => setMode({ type: 'creating' })}>
          Adicionar endereço
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-4">
        {addresses.map((address) => (
          <li key={address.id} className="border border-ink/10 p-5">
            <div className="mb-2 flex items-center gap-2">
              <Text size="sm" weight="semibold">
                {address.label}
              </Text>
              {address.isDefault && (
                <span className="bg-ink px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">
                  Padrão
                </span>
              )}
            </div>
            <Text size="sm" tone="muted">
              {address.recipientName}
            </Text>
            <Text size="sm" tone="muted">
              {address.street}, {address.number}
              {address.complement ? ` — ${address.complement}` : ''}
            </Text>
            <Text size="sm" tone="muted">
              {address.neighborhood}, {address.city} — {address.state.toUpperCase()}
            </Text>
            <Text size="sm" tone="muted" className="mb-3">
              CEP {address.zipCode}
            </Text>
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => setMode({ type: 'editing', addressId: address.id })}
                className="text-xs uppercase tracking-wider text-ink underline underline-offset-4"
              >
                Editar
              </button>
              {!address.isDefault && (
                <button
                  type="button"
                  disabled={pendingId === address.id}
                  onClick={() => handleSetDefault(address.id)}
                  className="text-xs uppercase tracking-wider text-ink underline underline-offset-4 disabled:opacity-40"
                >
                  Definir como padrão
                </button>
              )}
              <button
                type="button"
                disabled={pendingId === address.id}
                onClick={() => handleDelete(address.id)}
                className="text-xs uppercase tracking-wider text-error underline underline-offset-4 disabled:opacity-40"
              >
                Remover
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Button type="button" onClick={() => setMode({ type: 'creating' })} className="self-start">
        Adicionar endereço
      </Button>
    </div>
  );
}

/** Só um endereço padrão por vez — replica no estado local a mesma regra que o backend já garante. */
function withDefaultExclusive(addresses: Address[], updated: Address): Address[] {
  const withoutUpdated = addresses.filter((a) => a.id !== updated.id);
  const next = updated.isDefault
    ? withoutUpdated.map((a) => ({ ...a, isDefault: false }))
    : withoutUpdated;
  return [...next, updated].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}
