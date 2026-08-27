import type { CreateOrderInput, Order, PaymentIntentResult } from '@asn/types';
import { apiFetch } from './apiClient';
import { authenticatedFetch } from './authenticatedFetch';

/** Cria o pedido (convidado ou autenticado) — preço/estoque são sempre revalidados pelo servidor. */
export function createOrder(input: CreateOrderInput): Promise<Order> {
  return authenticatedFetch<Order>('/orders', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

/**
 * Sempre `authenticatedFetch`, mesmo para o link de confirmação pós-checkout
 * convidado: um pedido de convidado (`userId` nulo) não exige token nenhum
 * do lado da API, então enviar o header quando existe não muda nada para
 * esse caso — mas para um pedido de cliente autenticado, é exatamente o
 * header que faz essa mesma página de confirmação continuar funcionando
 * (a API agora só libera pedidos com dono para o próprio dono/admin).
 */
export function getOrder(id: string): Promise<Order> {
  return authenticatedFetch<Order>(`/orders/${id}`);
}

/** Histórico de pedidos do cliente autenticado (Área do Cliente). */
export function getMyOrders(): Promise<Order[]> {
  return authenticatedFetch<Order[]>('/orders');
}

/** Etapa de pagamento — hoje sempre `available: false` (ver `NullPaymentGateway` na API). */
export function getPaymentIntent(orderId: string): Promise<PaymentIntentResult> {
  return apiFetch<PaymentIntentResult>(`/orders/${orderId}/payment-intent`, {
    init: { method: 'POST' },
  });
}
