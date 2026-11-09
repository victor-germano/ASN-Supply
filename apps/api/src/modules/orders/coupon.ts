import type { Timestamp } from 'firebase-admin/firestore';

export interface CouponRecord {
  code: string;
  percentageOff: number | null;
  amountOffInCents: number | null;
  minOrderInCents: number | null;
  expiresAt: Date | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  isActive: boolean;
}

/** Shape bruto do documento `coupons/{codeNormalizado}` no Firestore. */
export interface CouponDoc {
  code: string;
  percentageOff: number | null;
  amountOffInCents: number | null;
  minOrderInCents: number | null;
  expiresAt: Timestamp | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  isActive: boolean;
}

export function couponDocToRecord(doc: CouponDoc): CouponRecord {
  return {
    code: doc.code,
    percentageOff: doc.percentageOff,
    amountOffInCents: doc.amountOffInCents,
    minOrderInCents: doc.minOrderInCents,
    expiresAt: doc.expiresAt?.toDate() ?? null,
    maxRedemptions: doc.maxRedemptions,
    redemptionCount: doc.redemptionCount,
    isActive: doc.isActive,
  };
}

export interface CouponValidationError {
  errorCode: string;
  message: string;
}

/**
 * Puramente funcional (sem Firestore/Prisma) de propósito — usado tanto pelo
 * preview (`CouponsService.preview`, fora de transação) quanto pela
 * aplicação real dentro da transação de `OrdersRepository.create`. `null` =
 * válido.
 */
export function validateCoupon(
  coupon: CouponRecord | null,
  subtotalInCents: number,
): CouponValidationError | null {
  if (!coupon) {
    return { errorCode: 'COUPON_NOT_FOUND', message: 'Cupom não encontrado.' };
  }
  if (!coupon.isActive) {
    return { errorCode: 'COUPON_INACTIVE', message: 'Este cupom não está mais ativo.' };
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { errorCode: 'COUPON_EXPIRED', message: 'Este cupom expirou.' };
  }
  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return { errorCode: 'COUPON_EXHAUSTED', message: 'Este cupom atingiu o limite de usos.' };
  }
  if (coupon.minOrderInCents !== null && subtotalInCents < coupon.minOrderInCents) {
    return {
      errorCode: 'COUPON_MIN_ORDER_NOT_MET',
      message: 'O subtotal do carrinho não atinge o mínimo exigido por este cupom.',
    };
  }
  return null;
}

/** Nunca desconta mais que o próprio subtotal (evita total negativo com um `amountOffInCents` alto). */
export function calculateCouponDiscountInCents(
  coupon: CouponRecord,
  subtotalInCents: number,
): number {
  const raw =
    coupon.percentageOff !== null
      ? Math.round((subtotalInCents * coupon.percentageOff) / 100)
      : (coupon.amountOffInCents ?? 0);
  return Math.min(raw, subtotalInCents);
}
