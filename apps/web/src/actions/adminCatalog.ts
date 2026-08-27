'use server';

import { revalidatePath } from 'next/cache';
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
import { ApiError } from '@/services/apiClient';
import {
  createAdminBrand,
  createAdminCategory,
  createAdminCollection,
  deleteAdminBrand,
  deleteAdminCategory,
  deleteAdminCollection,
  updateAdminBrand,
  updateAdminCategory,
  updateAdminCollection,
} from '@/services/adminCatalog.service';

export type AdminBrandActionResult =
  { success: true; brand: Brand } | { success: false; message: string };
export type AdminCategoryActionResult =
  { success: true; category: AdminCategory } | { success: false; message: string };
export type AdminCollectionActionResult =
  { success: true; collection: AdminCollection } | { success: false; message: string };
export type AdminCatalogDeleteResult = { success: true } | { success: false; message: string };

function genericErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Não foi possível salvar agora. Tente novamente em instantes.';
}

// Marcas -----------------------------------------------------------------

export async function createAdminBrandAction(
  input: CreateBrandInput,
): Promise<AdminBrandActionResult> {
  try {
    const brand = await createAdminBrand(input);
    revalidatePath('/admin/catalogo');
    return { success: true, brand };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function updateAdminBrandAction(
  id: string,
  input: UpdateBrandInput,
): Promise<AdminBrandActionResult> {
  try {
    const brand = await updateAdminBrand(id, input);
    revalidatePath('/admin/catalogo');
    return { success: true, brand };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function deleteAdminBrandAction(id: string): Promise<AdminCatalogDeleteResult> {
  try {
    await deleteAdminBrand(id);
    revalidatePath('/admin/catalogo');
    return { success: true };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

// Categorias ---------------------------------------------------------------

export async function createAdminCategoryAction(
  input: CreateCategoryInput,
): Promise<AdminCategoryActionResult> {
  try {
    const category = await createAdminCategory(input);
    revalidatePath('/admin/catalogo');
    return { success: true, category };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function updateAdminCategoryAction(
  id: string,
  input: UpdateCategoryInput,
): Promise<AdminCategoryActionResult> {
  try {
    const category = await updateAdminCategory(id, input);
    revalidatePath('/admin/catalogo');
    return { success: true, category };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function deleteAdminCategoryAction(id: string): Promise<AdminCatalogDeleteResult> {
  try {
    await deleteAdminCategory(id);
    revalidatePath('/admin/catalogo');
    return { success: true };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

// Coleções -------------------------------------------------------------------

export async function createAdminCollectionAction(
  input: CreateCollectionInput,
): Promise<AdminCollectionActionResult> {
  try {
    const collection = await createAdminCollection(input);
    revalidatePath('/admin/catalogo');
    return { success: true, collection };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function updateAdminCollectionAction(
  id: string,
  input: UpdateCollectionInput,
): Promise<AdminCollectionActionResult> {
  try {
    const collection = await updateAdminCollection(id, input);
    revalidatePath('/admin/catalogo');
    return { success: true, collection };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function deleteAdminCollectionAction(id: string): Promise<AdminCatalogDeleteResult> {
  try {
    await deleteAdminCollection(id);
    revalidatePath('/admin/catalogo');
    return { success: true };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}
