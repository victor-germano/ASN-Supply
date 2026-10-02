import type { CouponPreview } from '@asn/types';
import { serverFetch } from './serverFetch';

/** Público (sem login) — `serverFetch`, não `authenticatedFetch`: mesmo espírito guest-friendly do resto do checkout. */
export function validateCoupon(code: string, subtotalInCents: number): Promise<CouponPreview> {
  return serverFetch<CouponPreview>('/coupons/validate', {
    init: { method: 'POST', body: JSON.stringify({ code, subtotalInCents }) },
  });
}
