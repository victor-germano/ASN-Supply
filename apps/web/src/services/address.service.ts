import type { Address, CreateAddressInput, UpdateAddressInput } from '@asn/types';
import { authenticatedFetch } from './authenticatedFetch';

export function getAddresses(): Promise<Address[]> {
  return authenticatedFetch<Address[]>('/addresses');
}

export function createAddress(input: CreateAddressInput): Promise<Address> {
  return authenticatedFetch<Address>('/addresses', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

export function updateAddress(id: string, input: UpdateAddressInput): Promise<Address> {
  return authenticatedFetch<Address>(`/addresses/${id}`, {
    init: { method: 'PATCH', body: JSON.stringify(input) },
  });
}

export function setDefaultAddress(id: string): Promise<Address> {
  return authenticatedFetch<Address>(`/addresses/${id}/default`, {
    init: { method: 'PATCH' },
  });
}

export function deleteAddress(id: string): Promise<void> {
  return authenticatedFetch<void>(`/addresses/${id}`, {
    init: { method: 'DELETE' },
  });
}
