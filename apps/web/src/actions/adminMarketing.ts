'use server';

import { revalidateStorefront } from './revalidateStorefront';
import type {
  AdminBanner,
  AdminSocialPost,
  CreateBannerInput,
  CreateSocialPostInput,
  UpdateBannerInput,
  UpdateSocialPostInput,
} from '@asn/types';
import { ApiError } from '@/services/apiClient';
import {
  createAdminBanner,
  createAdminSocialPost,
  deleteAdminBanner,
  deleteAdminSocialPost,
  updateAdminBanner,
  updateAdminSocialPost,
} from '@/services/adminMarketing.service';

export type AdminBannerActionResult =
  { success: true; banner: AdminBanner } | { success: false; message: string };
export type AdminSocialPostActionResult =
  { success: true; post: AdminSocialPost } | { success: false; message: string };
export type AdminMarketingDeleteResult = { success: true } | { success: false; message: string };

function genericErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Não foi possível salvar agora. Tente novamente em instantes.';
}

// Banners ------------------------------------------------------------------

export async function createAdminBannerAction(
  input: CreateBannerInput,
): Promise<AdminBannerActionResult> {
  try {
    const banner = await createAdminBanner(input);
    revalidateStorefront();
    return { success: true, banner };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function updateAdminBannerAction(
  id: string,
  input: UpdateBannerInput,
): Promise<AdminBannerActionResult> {
  try {
    const banner = await updateAdminBanner(id, input);
    revalidateStorefront();
    return { success: true, banner };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function deleteAdminBannerAction(id: string): Promise<AdminMarketingDeleteResult> {
  try {
    await deleteAdminBanner(id);
    revalidateStorefront();
    return { success: true };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

// Posts sociais --------------------------------------------------------------

export async function createAdminSocialPostAction(
  input: CreateSocialPostInput,
): Promise<AdminSocialPostActionResult> {
  try {
    const post = await createAdminSocialPost(input);
    revalidateStorefront();
    return { success: true, post };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function updateAdminSocialPostAction(
  id: string,
  input: UpdateSocialPostInput,
): Promise<AdminSocialPostActionResult> {
  try {
    const post = await updateAdminSocialPost(id, input);
    revalidateStorefront();
    return { success: true, post };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function deleteAdminSocialPostAction(id: string): Promise<AdminMarketingDeleteResult> {
  try {
    await deleteAdminSocialPost(id);
    revalidateStorefront();
    return { success: true };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}
