'use server';

import type { CartItem } from '@asn/types';
import {
  clearServerCart,
  getServerCart,
  removeCartItem,
  setCartItemQuantity,
} from '@/services/cart.service';

/** Mesmo padrão de `actions/wishlist.ts`: chamadas best-effort a partir de `CartSync` (Client Component). */
export async function getServerCartAction(): Promise<CartItem[] | null> {
  try {
    return await getServerCart();
  } catch {
    return null;
  }
}

export async function setCartItemQuantityAction(
  variantId: string,
  quantity: number,
): Promise<boolean> {
  try {
    await setCartItemQuantity(variantId, quantity);
    return true;
  } catch {
    return false;
  }
}

export async function removeCartItemAction(variantId: string): Promise<boolean> {
  try {
    await removeCartItem(variantId);
    return true;
  } catch {
    return false;
  }
}

export async function clearServerCartAction(): Promise<boolean> {
  try {
    await clearServerCart();
    return true;
  } catch {
    return false;
  }
}
