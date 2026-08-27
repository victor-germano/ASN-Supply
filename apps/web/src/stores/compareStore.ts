import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompareEntry {
  id: string;
  slug: string;
  name: string;
}

const MAX_COMPARE_ITEMS = 4;

interface CompareStore {
  items: CompareEntry[];
  hasHydrated: boolean;
  setHasHydrated: () => void;
  toggle: (entry: CompareEntry) => void;
  remove: (id: string) => void;
  clear: () => void;
  isComparing: (id: string) => boolean;
}

/**
 * Comparador de produtos (Módulo 8) — mesmo padrão local-first de
 * `wishlistStore`/`cartStore`: só localStorage, nenhuma conta necessária
 * (comparar é uma tarefa de navegador, não algo que precise seguir o
 * cliente entre dispositivos). Guarda `slug` junto (não só `id`) para
 * `/comparar` poder buscar o `ProductDetail` completo de cada item via
 * `getProductBySlug` sem precisar de um endpoint novo em lote.
 */
export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: () => set({ hasHydrated: true }),
      toggle: (entry) =>
        set((state) => {
          const exists = state.items.some((item) => item.id === entry.id);
          if (exists) {
            return { items: state.items.filter((item) => item.id !== entry.id) };
          }
          if (state.items.length >= MAX_COMPARE_ITEMS) {
            return state;
          }
          return { items: [...state.items, entry] };
        }),
      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      clear: () => set({ items: [] }),
      isComparing: (id) => get().items.some((item) => item.id === id),
    }),
    {
      name: 'asn-compare',
      skipHydration: true,
      onRehydrateStorage: () => (state) => state?.setHasHydrated(),
    },
  ),
);

export { MAX_COMPARE_ITEMS };
