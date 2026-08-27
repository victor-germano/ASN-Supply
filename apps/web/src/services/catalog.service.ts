import type {
  AiSearchResult,
  Banner,
  Brand,
  Category,
  Collection,
  PaginatedResult,
  PaginationParams,
  ProductFacets,
  ProductFilters,
  ProductSummary,
} from '@asn/types';
import { ApiError, apiFetch } from './apiClient';

/** Conteúdo de catálogo é cacheado por 5 minutos (ISR) — troca de estoque/preço não é instantânea nem precisa ser. */
const CATALOG_REVALIDATE_SECONDS = 300;

export function getActiveBanners(): Promise<Banner[]> {
  return apiFetch<Banner[]>('/banners', { revalidateSeconds: CATALOG_REVALIDATE_SECONDS });
}

export function getFeaturedProducts(
  feature: 'new-arrivals' | 'best-sellers',
  limit: number,
): Promise<ProductSummary[]> {
  return apiFetch<ProductSummary[]>('/products', {
    searchParams: { feature, limit },
    revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
  });
}

export function getLaunchedCollections(limit: number): Promise<Collection[]> {
  return apiFetch<Collection[]>('/collections', {
    searchParams: { limit },
    revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
  });
}

export function getTopLevelCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/categories', { revalidateSeconds: CATALOG_REVALIDATE_SECONDS });
}

export function getBrands(limit: number): Promise<Brand[]> {
  return apiFetch<Brand[]>('/brands', {
    searchParams: { limit },
    revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
  });
}

/** Listagem completa da PLP (Módulo 2) — filtros, ordenação e paginação real. */
export function searchProducts(
  filters: ProductFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<ProductSummary>> {
  return apiFetch<PaginatedResult<ProductSummary>>('/products/search', {
    searchParams: {
      brandSlugs: filters.brandSlugs?.join(','),
      categorySlugs: filters.categorySlugs?.join(','),
      collectionSlugs: filters.collectionSlugs?.join(','),
      colorNames: filters.colorNames?.join(','),
      sizes: filters.sizes?.join(','),
      genders: filters.genders?.join(','),
      minPriceInCents: filters.minPriceInCents,
      maxPriceInCents: filters.maxPriceInCents,
      query: filters.query,
      sort: filters.sort,
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
    // Não cacheado: cada combinação de filtros é uma URL diferente e a
    // listagem precisa refletir estoque/preço com a menor defasagem
    // possível — o custo de recomputar é baixo (é uma query indexada).
  });
}

/** "Busca por IA" (Módulo 8) — não cacheado, cada busca é uma consulta nova. */
export function aiSearchProducts(query: string): Promise<AiSearchResult> {
  return apiFetch<AiSearchResult>('/products/ai-search', {
    init: { method: 'POST', body: JSON.stringify({ query }) },
  });
}

export function getProductFacets(): Promise<ProductFacets> {
  return apiFetch<ProductFacets>('/products/facets', {
    revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
  });
}

/** `null` quando a coleção não existe ou ainda não foi lançada — o caller decide como tratar (ex: notFound()). */
export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  try {
    return await apiFetch<Collection>(`/collections/${slug}`, {
      revalidateSeconds: CATALOG_REVALIDATE_SECONDS,
    });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}
