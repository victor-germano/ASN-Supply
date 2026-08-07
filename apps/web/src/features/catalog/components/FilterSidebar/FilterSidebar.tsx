import type { ProductFacets } from '@asn/types';
import { GENDER_LABELS } from '@/features/catalog/constants';
import { FilterGroup } from './FilterGroup';
import { PriceRangeFilter } from './PriceRangeFilter';

export interface FilterSidebarProps {
  facets: ProductFacets;
  /** Query string atual da página (sem o `?`) — fonte única de verdade do estado dos filtros. */
  currentSearch: string;
  /** Omite o filtro de categoria (usado na página de coleção, onde a categoria não é o eixo principal de navegação). */
  hideCategoryFilter?: boolean;
}

export function FilterSidebar({
  facets,
  currentSearch,
  hideCategoryFilter = false,
}: FilterSidebarProps) {
  const current = new URLSearchParams(currentSearch);

  return (
    <div>
      {!hideCategoryFilter && (
        <FilterGroup
          title="Categoria"
          paramKey="categoria"
          currentSearch={current}
          options={facets.categories.map((c) => ({
            value: c.slug,
            label: c.label,
            count: c.count,
          }))}
        />
      )}
      <FilterGroup
        title="Marca"
        paramKey="marcas"
        currentSearch={current}
        options={facets.brands.map((b) => ({ value: b.slug, label: b.label, count: b.count }))}
      />
      <FilterGroup
        title="Gênero"
        paramKey="genders"
        currentSearch={current}
        options={facets.genders.map((g) => ({
          value: g.value,
          label: GENDER_LABELS[g.value] ?? g.value,
          count: g.count,
        }))}
      />
      <FilterGroup
        title="Cor"
        paramKey="cores"
        currentSearch={current}
        options={facets.colors.map((c) => ({
          value: c.name,
          label: c.name,
          count: c.count,
          swatchHex: c.hex,
        }))}
      />
      <FilterGroup
        title="Tamanho"
        paramKey="tamanhos"
        currentSearch={current}
        options={facets.sizes.map((s) => ({ value: s.size, label: s.size, count: s.count }))}
      />
      <PriceRangeFilter priceRange={facets.priceRange} currentSearch={current} />
    </div>
  );
}
