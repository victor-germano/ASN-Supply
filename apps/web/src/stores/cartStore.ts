import { create } from 'zustand';

interface CartStore {
  /** Quantidade total de itens no carrinho — 0 até o Módulo 4 implementar adição de itens. */
  itemCount: number;
  setItemCount: (count: number) => void;
}

/**
 * Estado global do carrinho. Hoje só expõe a contagem de itens (usada pelo
 * badge no Header); o Módulo 4 estende esta store com os itens completos,
 * totais e as ações de adicionar/remover.
 */
export const useCartStore = create<CartStore>((set) => ({
  itemCount: 0,
  setItemCount: (count) => set({ itemCount: count }),
}));
