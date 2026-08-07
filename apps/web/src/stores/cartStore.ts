import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  imageUrl: string;
  size: string;
  colorName: string;
  unitPriceInCents: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  /**
   * O servidor nunca tem acesso ao localStorage, então a primeira
   * renderização no cliente também começa com `items: []` — só depois de
   * `persist` reidratar (marcando isto como `true`) é seguro mostrar o
   * estado real sem gerar mismatch de hidratação do React.
   */
  hasHydrated: boolean;
  setHasHydrated: () => void;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeItem: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
}

/**
 * Estado do carrinho — local (localStorage) até o Módulo 4 implementar o
 * carrinho/checkout de verdade contra o backend (`Cart`/`CartItem` já
 * existem no schema desde o Módulo 0). Guardar os itens completos agora
 * (não só uma contagem) significa que o Módulo 4 evolui este estado em vez
 * de construí-lo do zero — "Adicionar ao carrinho" na PDP já funciona de
 * verdade, só ainda não persiste no servidor.
 */
export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: () => set({ hasHydrated: true }),
      addItem: (item, quantity) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'asn-cart',
      // Reidratação automática desligada de propósito: rodaria de forma
      // síncrona demais (antes da primeira renderização no cliente),
      // divergindo do HTML vazio que o servidor gerou (sem acesso a
      // localStorage) e quebrando a hidratação do React. Disparada
      // manualmente em `StoreHydration` dentro de um `useEffect`, que só
      // roda depois que a primeira renderização já bateu com o servidor.
      skipHydration: true,
      onRehydrateStorage: () => (state) => state?.setHasHydrated(),
    },
  ),
);

/** Quantidade total de itens — derivada, nunca guardada em duplicado no estado. */
export function useCartItemCount(): number {
  return useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
}
