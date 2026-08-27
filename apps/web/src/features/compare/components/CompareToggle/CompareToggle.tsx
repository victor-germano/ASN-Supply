'use client';

import type { ProductSummary } from '@asn/types';
import { useCompareStore, MAX_COMPARE_ITEMS } from '@/stores/compareStore';
import { CompareIcon } from '@/components/icons';

/**
 * Overlay sobre `ProductCard` (mesmo padrão do botão de remover em
 * `WishlistView`) — sibling posicionado por fora do `<Link>` do card, não
 * dentro dele, pra não aninhar elemento interativo dentro de outro.
 */
export function CompareToggle({ product }: { product: ProductSummary }) {
  const isComparing = useCompareStore((state) => state.isComparing(product.id));
  const itemCount = useCompareStore((state) => state.items.length);
  const toggle = useCompareStore((state) => state.toggle);

  const atLimit = !isComparing && itemCount >= MAX_COMPARE_ITEMS;

  return (
    <button
      type="button"
      disabled={atLimit}
      onClick={() => toggle({ id: product.id, slug: product.slug, name: product.name })}
      aria-pressed={isComparing}
      aria-label={
        isComparing
          ? `Remover ${product.name} da comparação`
          : atLimit
            ? `Limite de ${MAX_COMPARE_ITEMS} produtos na comparação atingido`
            : `Adicionar ${product.name} à comparação`
      }
      title={atLimit && !isComparing ? `Máximo de ${MAX_COMPARE_ITEMS} produtos` : undefined}
      className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
        isComparing
          ? 'border-ink bg-ink text-white'
          : 'border-ink/15 bg-bone-50/90 text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-40'
      }`}
    >
      <CompareIcon className="h-4 w-4" />
    </button>
  );
}
