'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ProductSortOption } from '@asn/types';
import { setSingleParam } from '@/features/catalog/utils/productSearchParams';

const SORT_LABELS: Record<ProductSortOption, string> = {
  RELEVANCE: 'Relevância',
  NEWEST: 'Mais recentes',
  PRICE_ASC: 'Menor preço',
  PRICE_DESC: 'Maior preço',
  BEST_SELLING: 'Mais vendidos',
  TOP_RATED: 'Melhor avaliados',
};

export function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = (searchParams.get('sort') as ProductSortOption | null) ?? 'RELEVANCE';

  return (
    <label className="flex items-center gap-2 text-sm text-ink-muted">
      <span className="hidden sm:inline">Ordenar por</span>
      <select
        value={currentSort}
        onChange={(event) => {
          const query = setSingleParam(searchParams, 'sort', event.target.value);
          router.push(`?${query}`, { scroll: false });
        }}
        // Nome acessível explícito: no mobile o texto "Ordenar por" some da
        // tela (`hidden`), o que também remove o texto do label da árvore
        // de acessibilidade — o select ficaria sem nome nenhum sem isto.
        aria-label="Ordenar por"
        className="h-11 border border-ink/15 bg-transparent px-3 text-sm text-ink focus-visible:border-ink focus-visible:outline-none"
      >
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
