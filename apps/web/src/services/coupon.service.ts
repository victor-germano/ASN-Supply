import type { CouponPreview } from '@asn/types';
import { apiFetch } from './apiClient';

/** Público (sem login) — `apiFetch`, não `authenticatedFetch`: mesmo espírito guest-friendly do resto do checkout. */
export function validateCoupon(code: string, subtotalInCents: number): Promise<CouponPreview> {
  return apiFetch<CouponPreview>('/coupons/validate', {
    init: { method: 'POST', body: JSON.stringify({ code, subtotalInCents }) },
  });
}
