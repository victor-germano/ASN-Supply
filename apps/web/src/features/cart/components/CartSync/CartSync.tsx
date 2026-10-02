'use client';

import { useEffect, useRef, useState } from 'react';
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
 *
 * Por isso o merge só pode rodar UMA vez por conta: depois dele, o
 * carrinho local já é espelho do da conta, e somar de novo duplica.
 * `syncedUserId` (persistido no `cartStore`) registra isso entre recargas.
 */
export function CartSync() {
  const { user } = useCurrentUser();
  // Só o ID: o objeto `user` muda de identidade a cada refetch da query
  // (logo depois do login, por exemplo), e re-disparar o efeito por isso
  // cancelava o merge em andamento — que aí nunca terminava.
  const userId = user?.id ?? null;
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const syncedUserId = useCartStore((state) => state.syncedUserId);
  const mergingForUserId = useRef<string | null>(null);
  // Bump pra reavaliar o efeito quando um merge falha (rede/API fora) —
  // sem isso ele só tentaria de novo na próxima recarga de página.
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!userId || !hasHydrated || syncedUserId === userId) return;
    if (mergingForUserId.current === userId) return;

    mergingForUserId.current = userId;
    // Sem cancelamento de propósito: um merge iniciado sempre termina — o
    // estado do store é relido no fim, então não há valor velho de closure.
    void (async () => {
      let merged = false;
      try {
        const backendItems = await getServerCartAction();
        if (backendItems === null) return;
        const store = useCartStore.getState();
        if (store.syncedUserId === userId) {
          merged = true;
          return;
        }
        // Itens locais que são espelho de OUTRA conta (troca de usuário no
        // mesmo navegador sem "Sair") não pertencem a quem entrou agora.
        const localItems = store.syncedUserId === null ? store.items : [];
        await mergeIntoAccount(backendItems, localItems);
        useCartStore.getState().setSyncedUserId(userId);
        merged = true;
      } finally {
        mergingForUserId.current = null;
        if (!merged) setTimeout(() => setRetryTick((tick) => tick + 1), 3000);
      }
    })();
  }, [userId, hasHydrated, syncedUserId, retryTick]);

  useEffect(() => {
    let previousItems = useCartStore.getState().items;
    return useCartStore.subscribe((state) => {
      const currentItems = state.items;
      const previousByVariant = new Map(previousItems.map((item) => [item.variantId, item]));
      const currentByVariant = new Map(currentItems.map((item) => [item.variantId, item]));
      previousItems = currentItems;

      // Enquanto o merge de login desta conta não terminou, mudanças locais
      // ficam só locais — o próprio merge as soma ao carrinho da conta.
      // Empurrá-las já aqui fazia o merge somar o mesmo item duas vezes
      // (cliente que clicava "Adicionar" logo depois de entrar levava 2).
      if (!userId || state.syncedUserId !== userId) return;

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
  }, [userId]);

  return null;
}

type ServerCartItems = NonNullable<Awaited<ReturnType<typeof getServerCartAction>>>;

/** Soma carrinho da conta + carrinho de convidado deste aparelho e grava o resultado nos dois lados. */
async function mergeIntoAccount(
  backendItems: ServerCartItems,
  localItems: LocalCartItem[],
): Promise<void> {
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
}
