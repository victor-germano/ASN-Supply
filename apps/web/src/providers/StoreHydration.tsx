'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';

/**
 * Reidrata as stores persistidas (Zustand + localStorage) manualmente, num
 * `useEffect` — ou seja, só depois que a primeira renderização no cliente
 * já bateu com o HTML vazio gerado pelo servidor (que nunca tem acesso ao
 * localStorage). Ver `skipHydration` em cada store para o porquê. Não
 * renderiza nada; só dispara o efeito colateral uma vez, no mount.
 */
export function StoreHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
    useWishlistStore.persist.rehydrate();
    useRecentlyViewedStore.persist.rehydrate();
  }, []);

  return null;
}
