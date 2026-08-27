import { authenticatedFetch } from './authenticatedFetch';

export function getWishlist(): Promise<string[]> {
  return authenticatedFetch<string[]>('/wishlist');
}

export function addToWishlist(productId: string): Promise<void> {
  return authenticatedFetch<void>(`/wishlist/${productId}`, { init: { method: 'POST' } });
}

export function removeFromWishlist(productId: string): Promise<void> {
  return authenticatedFetch<void>(`/wishlist/${productId}`, { init: { method: 'DELETE' } });
}
