'use server';

import { addToWishlist, getWishlist, removeFromWishlist } from '@/services/wishlist.service';

/**
 * Chamadas a partir de `WishlistSync` (Client Component) — precisam ser
 * Server Actions porque `asn_at` é httpOnly (o client nunca o lê direto).
 * `null` em vez de lançar: `WishlistSync` trata falha de rede/401 como
 * "não sincronizou desta vez", não como erro fatal — o favorito local
 * continua funcionando de qualquer forma.
 */
export async function getWishlistAction(): Promise<string[] | null> {
  try {
    return await getWishlist();
  } catch {
    return null;
  }
}

export async function addToWishlistAction(productId: string): Promise<boolean> {
  try {
    await addToWishlist(productId);
    return true;
  } catch {
    return false;
  }
}

export async function removeFromWishlistAction(productId: string): Promise<boolean> {
  try {
    await removeFromWishlist(productId);
    return true;
  } catch {
    return false;
  }
}
