import type { AdminProductDetail, PaginatedResult, AdminProductListItem } from '@asn/types';
import { authenticatedFetch } from './authenticatedFetch';

export interface AdminProductFormInput {
  name: string;
  description: string;
  materials: string[];
  technologies: string[];
  gender: AdminProductDetail['gender'];
  priceInCents: number;
  compareAtPriceInCents: number | null;
  brandId: string;
  categoryId: string;
  collectionId: string | null;
  isPublished: boolean;
  images: { url: string; alt: string; width: number; height: number; position: number }[];
  variants: {
    size: string;
    colorName: string;
    colorHex: string;
    stockQuantity: number;
    priceOverrideInCents: number | null;
  }[];
}

export function getAdminProducts(params: {
  page: number;
  pageSize: number;
  q?: string;
}): Promise<PaginatedResult<AdminProductListItem>> {
  return authenticatedFetch<PaginatedResult<AdminProductListItem>>('/admin/products', {
    searchParams: { page: params.page, pageSize: params.pageSize, q: params.q },
  });
}

export function getAdminProduct(id: string): Promise<AdminProductDetail> {
  return authenticatedFetch<AdminProductDetail>(`/admin/products/${id}`);
}

export function createAdminProduct(input: AdminProductFormInput): Promise<AdminProductDetail> {
  return authenticatedFetch<AdminProductDetail>('/admin/products', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

export function updateAdminProduct(
  id: string,
  input: AdminProductFormInput,
): Promise<AdminProductDetail> {
  return authenticatedFetch<AdminProductDetail>(`/admin/products/${id}`, {
    init: { method: 'PATCH', body: JSON.stringify(input) },
  });
}

export function deleteAdminProduct(id: string): Promise<void> {
  return authenticatedFetch<void>(`/admin/products/${id}`, { init: { method: 'DELETE' } });
}
