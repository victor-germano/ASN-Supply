import type { LookItem, ProductDetail, ProductSummary } from '@asn/types';
import { ApiError, apiFetch } from './apiClient';

const PRODUCT_REVALIDATE_SECONDS = 120;

/** `null` quando o produto não existe ou não está publicado — o caller decide como tratar (ex: notFound()). */
export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  try {
    return await apiFetch<ProductDetail>(`/products/${slug}`, {
      revalidateSeconds: PRODUCT_REVALIDATE_SECONDS,
    });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export function getRelatedProducts(slug: string, limit: number): Promise<ProductSummary[]> {
  return apiFetch<ProductSummary[]>(`/products/${slug}/related`, {
    searchParams: { limit },
    revalidateSeconds: PRODUCT_REVALIDATE_SECONDS,
  });
}

/** "Complete o look" (Provador Digital) — lista vazia é o caso normal, não um erro. */
export function getLookItems(slug: string): Promise<LookItem[]> {
  return apiFetch<LookItem[]>(`/products/${slug}/look-items`, {
    revalidateSeconds: PRODUCT_REVALIDATE_SECONDS,
  });
}

export function getProductsByIds(ids: string[]): Promise<ProductSummary[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return apiFetch<ProductSummary[]>('/products/by-ids', {
    searchParams: { ids: ids.join(',') },
  });
}
