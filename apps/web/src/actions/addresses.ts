'use server';

import { revalidatePath } from 'next/cache';
import type { Address, CreateAddressInput, UpdateAddressInput } from '@asn/types';
import { ApiError } from '@/services/apiClient';
import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from '@/services/address.service';

export type AddressActionResult =
  { success: true; address: Address } | { success: false; message: string };

export type DeleteAddressActionResult = { success: true } | { success: false; message: string };

function genericErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Não foi possível salvar seu endereço agora. Tente novamente em instantes.';
}

/**
 * Chamada a partir do seletor de endereço salvo no checkout (Client
 * Component) — `null` em vez de lançar: convidado (401) e qualquer outra
 * falha viram "sem endereços salvos, segue com o formulário digitado" em
 * vez de erro visível, mesmo padrão best-effort de `getWishlistAction`.
 */
export async function getAddressesAction(): Promise<Address[] | null> {
  try {
    return await getAddresses();
  } catch {
    return null;
  }
}

export async function createAddressAction(input: CreateAddressInput): Promise<AddressActionResult> {
  try {
    const address = await createAddress(input);
    revalidatePath('/conta/enderecos');
    return { success: true, address };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function updateAddressAction(
  id: string,
  input: UpdateAddressInput,
): Promise<AddressActionResult> {
  try {
    const address = await updateAddress(id, input);
    revalidatePath('/conta/enderecos');
    return { success: true, address };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function setDefaultAddressAction(id: string): Promise<AddressActionResult> {
  try {
    const address = await setDefaultAddress(id);
    revalidatePath('/conta/enderecos');
    return { success: true, address };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function deleteAddressAction(id: string): Promise<DeleteAddressActionResult> {
  try {
    await deleteAddress(id);
    revalidatePath('/conta/enderecos');
    return { success: true };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}
