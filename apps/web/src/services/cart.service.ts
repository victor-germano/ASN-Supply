import type { CartItem } from '@asn/types';
import { authenticatedFetch } from './authenticatedFetch';

export function getServerCart(): Promise<CartItem[]> {
  return authenticatedFetch<CartItem[]>('/cart');
}

export function setCartItemQuantity(variantId: string, quantity: number): Promise<void> {
  return authenticatedFetch<void>(`/cart/items/${variantId}`, {
    init: { method: 'PUT', body: JSON.stringify({ quantity }) },
  });
}

export function removeCartItem(variantId: string): Promise<void> {
  return authenticatedFetch<void>(`/cart/items/${variantId}`, { init: { method: 'DELETE' } });
}

export function clearServerCart(): Promise<void> {
  return authenticatedFetch<void>('/cart', { init: { method: 'DELETE' } });
}
