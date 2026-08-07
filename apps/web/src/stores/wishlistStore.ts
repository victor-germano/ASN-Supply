import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistStore {
  productIds: string[];
  hasHydrated: boolean;
  setHasHydrated: () => void;
  toggle: (productId: string) => void;
  isFavorited: (productId: string) => boolean;
}

/**
 * Favoritos — local (localStorage) até o Módulo 5 (autenticação) existir
 * para sincronizar com o `WishlistItem` do backend (schema já existe desde
 * o Módulo 0). Funciona de verdade e persiste entre sessões no mesmo
 * navegador; só não sincroniza entre dispositivos ainda.
 */
export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      productIds: [],
      hasHydrated: false,
      setHasHydrated: () => set({ hasHydrated: true }),
      toggle: (productId) =>
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds.filter((id) => id !== productId)
            : [...state.productIds, productId],
        })),
      isFavorited: (productId) => get().productIds.includes(productId),
    }),
    {
      name: 'asn-wishlist',
      // Ver justificativa detalhada em `cartStore.ts` — mesmo risco de
      // mismatch de hidratação entre servidor (sem localStorage) e cliente.
      skipHydration: true,
      onRehydrateStorage: () => (state) => state?.setHasHydrated(),
    },
  ),
);
