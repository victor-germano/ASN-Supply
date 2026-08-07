import type { PaginatedResult, ProductFacets, ProductFilters, ProductSummary } from '@asn/types';
import { ProductCard } from '@/features/catalog/components/ProductCard/ProductCard';
import { FilterSidebar } from '@/features/catalog/components/FilterSidebar/FilterSidebar';
import { FilterDrawer } from '@/features/catalog/components/FilterSidebar/FilterDrawer';
import { SortDropdown } from '@/features/catalog/components/SortDropdown/SortDropdown';
import { SearchBar } from '@/features/catalog/components/SearchBar/SearchBar';
import { ActiveFilterChips } from '@/features/catalog/components/ActiveFilterChips/ActiveFilterChips';
import { Pagination } from '@/features/catalog/components/Pagination/Pagination';
import { EmptyState } from '@/features/catalog/components/EmptyState/EmptyState';

export interface ProductListingLayoutProps {
  result: PaginatedResult<ProductSummary>;
  facets: ProductFacets;
  filters: ProductFilters;
  currentSearch: string;
  emptyStateHref: string;
  /** A página de coleção já escopa por coleção — filtrar por categoria dentro dela raramente faz sentido no v1. */
  hideCategoryFilter?: boolean;
}

/**
 * Bloco de busca + filtros + grid + paginação compartilhado entre `/produtos`
 * e `/colecoes/[slug]` — as duas páginas só diferem no cabeçalho (hero da
 * coleção vs. título simples) e no escopo dos filtros aplicados.
 */
export function ProductListingLayout({
  result,
  facets,
  filters,
  currentSearch,
  emptyStateHref,
  hideCategoryFilter = false,
}: ProductListingLayoutProps) {
  return (
    <>
      <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar />
        <div className="flex items-center gap-3">
          <FilterDrawer resultCount={result.totalItems}>
            <FilterSidebar
              facets={facets}
              currentSearch={currentSearch}
              hideCategoryFilter={hideCategoryFilter}
            />
          </FilterDrawer>
          <SortDropdown />
        </div>
      </div>

      <div className="pb-6">
        <ActiveFilterChips filters={filters} facets={facets} currentSearch={currentSearch} />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <FilterSidebar
            facets={facets}
            currentSearch={currentSearch}
            hideCategoryFilter={hideCategoryFilter}
          />
        </aside>

        <div>
          {result.items.length === 0 ? (
            <EmptyState href={emptyStateHref} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                {result.items.map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 2} />
                ))}
              </div>
              <div className="pt-12">
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  currentSearch={currentSearch}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
