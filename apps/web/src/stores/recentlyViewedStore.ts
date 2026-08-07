import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_RECENTLY_VIEWED = 12;

interface RecentlyViewedStore {
  productIds: string[];
  hasHydrated: boolean;
  setHasHydrated: () => void;
  registerView: (productId: string) => void;
}

/** Histórico local de produtos visitados — mais recente primeiro, sem duplicatas, limitado a 12. */
export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set) => ({
      productIds: [],
      hasHydrated: false,
      setHasHydrated: () => set({ hasHydrated: true }),
      registerView: (productId) =>
        set((state) => ({
          productIds: [productId, ...state.productIds.filter((id) => id !== productId)].slice(
            0,
            MAX_RECENTLY_VIEWED,
          ),
        })),
    }),
    {
      name: 'asn-recently-viewed',
      // Ver justificativa detalhada em `cartStore.ts`.
      skipHydration: true,
      onRehydrateStorage: () => (state) => state?.setHasHydrated(),
    },
  ),
);
