'use server';

import type { CouponPreview, CreateOrderInput, Order, PaymentIntentResult } from '@asn/types';
import { ApiError } from '@/services/apiClient';
import { createOrder, getPaymentIntent } from '@/services/order.service';
import { validateCoupon } from '@/services/coupon.service';

export type ValidateCouponActionResult =
  { success: true; coupon: CouponPreview } | { success: false; message: string };

/** Preview — não gasta o uso do cupom. `createOrderAction` (abaixo) que consome de verdade, na hora de confirmar. */
export async function validateCouponAction(
  code: string,
  subtotalInCents: number,
): Promise<ValidateCouponActionResult> {
  try {
    const coupon = await validateCoupon(code, subtotalInCents);
    return { success: true, coupon };
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : 'Não foi possível validar este cupom agora.';
    return { success: false, message };
  }
}

export type CreateOrderActionResult =
  { success: true; order: Order } | { success: false; message: string };

/**
 * Server Action chamada pela etapa de revisão do checkout — mantém a
 * chamada à API (com a URL base) inteiramente no servidor, e traduz erros
 * de validação/estoque (`ApiError`) numa mensagem que a revisão pode
 * mostrar sem expor detalhes internos do backend.
 */
export async function createOrderAction(input: CreateOrderInput): Promise<CreateOrderActionResult> {
  try {
    const order = await createOrder(input);
    return { success: true, order };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível finalizar seu pedido agora. Tente novamente em instantes.';
    return { success: false, message };
  }
}

const PAYMENT_UNAVAILABLE_FALLBACK: PaymentIntentResult = {
  available: false,
  method: null,
  providerReference: null,
  clientSecret: null,
  message: 'Não foi possível consultar o status do pagamento agora.',
};

export async function getPaymentIntentAction(orderId: string): Promise<PaymentIntentResult> {
  try {
    return await getPaymentIntent(orderId);
  } catch {
    return PAYMENT_UNAVAILABLE_FALLBACK;
  }
}
