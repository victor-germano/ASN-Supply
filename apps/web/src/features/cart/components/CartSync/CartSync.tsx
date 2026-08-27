'use client';

import { useEffect, useRef } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCartStore, type CartItem as LocalCartItem } from '@/stores/cartStore';
import {
  getServerCartAction,
  removeCartItemAction,
  setCartItemQuantityAction,
} from '@/actions/cart';

/**
 * Espelho de `WishlistSync` para o carrinho — mesma estratégia (local
 * sempre a fonte de verdade da UI, backend só existe pra sincronizar entre
 * dispositivos de quem está logado, merge único no login + diff contínuo
 * via `subscribe`). Ver o comentário lá para o raciocínio completo.
 *
 * Diferença: item de carrinho tem quantidade, não é só presença/ausência —
 * o merge de login soma as quantidades de um mesmo `variantId` (2 no
 * carrinho da conta + 1 adicionado como convidado neste aparelho = 3) em
 * vez de escolher um lado.
 */
export function CartSync() {
  const { user } = useCurrentUser();
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const hasMergedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !hasHydrated || hasMergedForUserId.current === user.id) return;

    let cancelled = false;
    (async () => {
      const backendItems = await getServerCartAction();
      if (cancelled || backendItems === null) return;
      hasMergedForUserId.current = user.id;

      const localItems = useCartStore.getState().items;
      const merged = new Map<string, LocalCartItem>();
      for (const item of backendItems) {
        merged.set(item.variantId, {
          variantId: item.variantId,
          productId: item.productId,
          productSlug: item.productSlug,
          productName: item.productName,
          imageUrl: item.imageUrl,
          size: item.size,
          colorName: item.colorName,
          unitPriceInCents: item.unitPrice.amountInCents,
          quantity: item.quantity,
        });
      }
      for (const local of localItems) {
        const existing = merged.get(local.variantId);
        merged.set(
          local.variantId,
          existing ? { ...existing, quantity: existing.quantity + local.quantity } : local,
        );
      }
      const mergedItems = Array.from(merged.values());
      useCartStore.setState({ items: mergedItems });

      await Promise.all(
        mergedItems.map((item) => setCartItemQuantityAction(item.variantId, item.quantity)),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [user, hasHydrated]);

  useEffect(() => {
    let previousItems = useCartStore.getState().items;
    return useCartStore.subscribe((state) => {
      const currentItems = state.items;
      const previousByVariant = new Map(previousItems.map((item) => [item.variantId, item]));
      const currentByVariant = new Map(currentItems.map((item) => [item.variantId, item]));
      previousItems = currentItems;

      if (!user) return;

      for (const [variantId, item] of currentByVariant) {
        const before = previousByVariant.get(variantId);
        if (!before || before.quantity !== item.quantity) {
          setCartItemQuantityAction(variantId, item.quantity);
        }
      }
      for (const variantId of previousByVariant.keys()) {
        if (!currentByVariant.has(variantId)) {
          removeCartItemAction(variantId);
        }
      }
    });
  }, [user]);

  return null;
}
