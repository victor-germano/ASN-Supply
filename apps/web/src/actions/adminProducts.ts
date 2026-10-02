'use server';

import { revalidateStorefront } from './revalidateStorefront';
import type { AdminProductDetail } from '@asn/types';
import { ApiError } from '@/services/apiClient';
import {
  createAdminProduct,
  deleteAdminProduct,
  updateAdminProduct,
  type AdminProductFormInput,
} from '@/services/adminProducts.service';

export type AdminProductActionResult =
  { success: true; product: AdminProductDetail } | { success: false; message: string };

export type DeleteAdminProductActionResult =
  { success: true } | { success: false; message: string };

function genericErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Não foi possível salvar o produto agora. Tente novamente em instantes.';
}

export async function createAdminProductAction(
  input: AdminProductFormInput,
): Promise<AdminProductActionResult> {
  try {
    const product = await createAdminProduct(input);
    revalidateStorefront();
    return { success: true, product };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function updateAdminProductAction(
  id: string,
  input: AdminProductFormInput,
): Promise<AdminProductActionResult> {
  try {
    const product = await updateAdminProduct(id, input);
    revalidateStorefront();
    return { success: true, product };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function deleteAdminProductAction(
  id: string,
): Promise<DeleteAdminProductActionResult> {
  try {
    await deleteAdminProduct(id);
    revalidateStorefront();
    return { success: true };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}
