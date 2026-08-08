import type { CreateOrderInput, Order, PaymentIntentResult } from '@asn/types';
import { apiFetch } from './apiClient';

/** Cria o pedido (checkout como convidado) — preço/estoque são sempre revalidados pelo servidor. */
export function createOrder(input: CreateOrderInput): Promise<Order> {
  return apiFetch<Order>('/orders', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

export function getOrder(id: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${id}`);
}

/** Etapa de pagamento — hoje sempre `available: false` (ver `NullPaymentGateway` na API). */
export function getPaymentIntent(orderId: string): Promise<PaymentIntentResult> {
  return apiFetch<PaymentIntentResult>(`/orders/${orderId}/payment-intent`, {
    init: { method: 'POST' },
  });
}
