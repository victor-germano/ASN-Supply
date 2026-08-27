'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Address } from '@asn/types';
import { Text } from '@asn/ui';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getAddressesAction } from '@/actions/addresses';

interface AddressSelectorProps {
  selectedAddressId: string | null;
  onSelect: (address: Address | null) => void;
}

/**
 * Seletor de endereço salvo no checkout — só aparece pra cliente
 * autenticado com pelo menos um endereço em `/conta/enderecos`; convidado
 * (ou cliente sem nenhum salvo ainda) nunca vê isto, cai direto no
 * formulário digitado de sempre (`ContactAddressStep`). Endereço padrão
 * (ou o primeiro, se nenhum for padrão) é pré-selecionado automaticamente
 * ao carregar — quem já tem conta e endereço não precisa clicar em nada.
 */
export function AddressSelector({ selectedAddressId, onSelect }: AddressSelectorProps) {
  const { user } = useCurrentUser();
  const hasAutoSelected = useRef(false);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['checkout-addresses'],
    queryFn: getAddressesAction,
    enabled: !!user,
  });

  useEffect(() => {
    if (hasAutoSelected.current || !addresses || addresses.length === 0) return;
    hasAutoSelected.current = true;
    const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
    if (defaultAddress) onSelect(defaultAddress);
    // `onSelect` identidade muda a cada render de `CheckoutView` (não está
    // memoizada) — incluir na dependência disparia este efeito de novo sem
    // motivo; `hasAutoSelected` já garante que só roda uma vez mesmo assim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  if (!user || isLoading) return null;
  if (!addresses || addresses.length === 0) return null;

  return (
    <div className="mb-6">
      <Text size="xs" weight="semibold" className="mb-3 uppercase tracking-wider text-ink-muted">
        Endereço salvo
      </Text>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {addresses.map((address) => (
          <AddressCard
            key={address.id}
            address={address}
            isSelected={selectedAddressId === address.id}
            onClick={() => onSelect(address)}
          />
        ))}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`flex flex-col items-center justify-center gap-1 border p-4 text-center transition-colors ${
            selectedAddressId === null
              ? 'border-ink bg-ink text-white'
              : 'border-dashed border-ink/25 text-ink-muted hover:border-ink/50'
          }`}
        >
          <Text size="sm" className={selectedAddressId === null ? 'text-white' : undefined}>
            + Digitar outro endereço
          </Text>
        </button>
      </div>
    </div>
  );
}

function AddressCard({
  address,
  isSelected,
  onClick,
}: {
  address: Address;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`flex flex-col items-start gap-1 border p-4 text-left transition-colors ${
        isSelected ? 'border-ink bg-ink text-white' : 'border-ink/15 hover:border-ink/40'
      }`}
    >
      <div className="flex items-center gap-2">
        <Text size="sm" weight="semibold" className={isSelected ? 'text-white' : undefined}>
          {address.label}
        </Text>
        {address.isDefault && (
          <span
            className={`px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
              isSelected ? 'bg-white/20 text-white' : 'bg-ink/10 text-ink-muted'
            }`}
          >
            Padrão
          </span>
        )}
      </div>
      <Text size="xs" className={isSelected ? 'text-white/80' : 'text-ink-muted'}>
        {address.street}, {address.number}
        {address.complement ? ` — ${address.complement}` : ''}
      </Text>
      <Text size="xs" className={isSelected ? 'text-white/80' : 'text-ink-muted'}>
        {address.neighborhood}, {address.city} — {address.state.toUpperCase()}
      </Text>
    </button>
  );
}
