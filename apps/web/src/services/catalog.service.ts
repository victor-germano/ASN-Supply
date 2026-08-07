import type { Banner, Brand, Category, Collection, ProductSummary } from '@asn/types';
import { apiFetch } from './apiClient';

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
