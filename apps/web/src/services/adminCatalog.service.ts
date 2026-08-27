import type {
  AdminCategory,
  AdminCollection,
  Brand,
  CreateBrandInput,
  CreateCategoryInput,
  CreateCollectionInput,
  UpdateBrandInput,
  UpdateCategoryInput,
  UpdateCollectionInput,
} from '@asn/types';
import { authenticatedFetch } from './authenticatedFetch';

// Marcas -----------------------------------------------------------------

export function getAdminBrands(): Promise<Brand[]> {
  return authenticatedFetch<Brand[]>('/admin/brands');
}

export function createAdminBrand(input: CreateBrandInput): Promise<Brand> {
  return authenticatedFetch<Brand>('/admin/brands', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

export function updateAdminBrand(id: string, input: UpdateBrandInput): Promise<Brand> {
  return authenticatedFetch<Brand>(`/admin/brands/${id}`, {
    init: { method: 'PATCH', body: JSON.stringify(input) },
  });
}

export function deleteAdminBrand(id: string): Promise<void> {
  return authenticatedFetch<void>(`/admin/brands/${id}`, { init: { method: 'DELETE' } });
}

// Categorias ---------------------------------------------------------------

export function getAdminCategories(): Promise<AdminCategory[]> {
  return authenticatedFetch<AdminCategory[]>('/admin/categories');
}

export function createAdminCategory(input: CreateCategoryInput): Promise<AdminCategory> {
  return authenticatedFetch<AdminCategory>('/admin/categories', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

export function updateAdminCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<AdminCategory> {
  return authenticatedFetch<AdminCategory>(`/admin/categories/${id}`, {
    init: { method: 'PATCH', body: JSON.stringify(input) },
  });
}

export function deleteAdminCategory(id: string): Promise<void> {
  return authenticatedFetch<void>(`/admin/categories/${id}`, { init: { method: 'DELETE' } });
}

// Coleções -------------------------------------------------------------------

export function getAdminCollections(): Promise<AdminCollection[]> {
  return authenticatedFetch<AdminCollection[]>('/admin/collections');
}

export function createAdminCollection(input: CreateCollectionInput): Promise<AdminCollection> {
  return authenticatedFetch<AdminCollection>('/admin/collections', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

export function updateAdminCollection(
  id: string,
  input: UpdateCollectionInput,
): Promise<AdminCollection> {
  return authenticatedFetch<AdminCollection>(`/admin/collections/${id}`, {
    init: { method: 'PATCH', body: JSON.stringify(input) },
  });
}

export function deleteAdminCollection(id: string): Promise<void> {
  return authenticatedFetch<void>(`/admin/collections/${id}`, { init: { method: 'DELETE' } });
}
