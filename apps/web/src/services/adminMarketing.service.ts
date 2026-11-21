import type {
  AdminBanner,
  AdminSocialPost,
  CreateBannerInput,
  CreateSocialPostInput,
  UpdateBannerInput,
  UpdateSocialPostInput,
} from '@asn/types';
import { authenticatedFetch } from './authenticatedFetch';

// Banners ------------------------------------------------------------------

export function getAdminBanners(): Promise<AdminBanner[]> {
  return authenticatedFetch<AdminBanner[]>('/admin/banners');
}

export function createAdminBanner(input: CreateBannerInput): Promise<AdminBanner> {
  return authenticatedFetch<AdminBanner>('/admin/banners', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

export function updateAdminBanner(id: string, input: UpdateBannerInput): Promise<AdminBanner> {
  return authenticatedFetch<AdminBanner>(`/admin/banners/${id}`, {
    init: { method: 'PATCH', body: JSON.stringify(input) },
  });
}

export function deleteAdminBanner(id: string): Promise<void> {
  return authenticatedFetch<void>(`/admin/banners/${id}`, { init: { method: 'DELETE' } });
}

// Posts sociais --------------------------------------------------------------

export function getAdminSocialPosts(): Promise<AdminSocialPost[]> {
  return authenticatedFetch<AdminSocialPost[]>('/admin/social-posts');
}

export function createAdminSocialPost(input: CreateSocialPostInput): Promise<AdminSocialPost> {
  return authenticatedFetch<AdminSocialPost>('/admin/social-posts', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

export function updateAdminSocialPost(
  id: string,
  input: UpdateSocialPostInput,
): Promise<AdminSocialPost> {
  return authenticatedFetch<AdminSocialPost>(`/admin/social-posts/${id}`, {
    init: { method: 'PATCH', body: JSON.stringify(input) },
  });
}

export function deleteAdminSocialPost(id: string): Promise<void> {
  return authenticatedFetch<void>(`/admin/social-posts/${id}`, { init: { method: 'DELETE' } });
}
