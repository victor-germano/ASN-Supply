import type { ShippingMethod } from '@asn/types';

const FREE_SHIPPING_THRESHOLD_IN_CENTS = 50_000;
const STANDARD_SHIPPING_COST_IN_CENTS = 2_990;
const EXPRESS_SHIPPING_COST_IN_CENTS = 5_990;

/**
 * Espelha `calculateShippingCostInCents` da API (apps/api/src/modules/orders/shipping.ts)
 * só para mostrar o valor ao vivo enquanto o cliente escolhe o frete — a
 * API sempre recalcula o total de verdade ao criar o pedido, então uma
 * divergência aqui gera no máximo um preview levemente errado por um
 * instante, nunca um pedido com preço incorreto.
 */
export function previewShippingCostInCents(
  method: ShippingMethod,
  subtotalInCents: number,
): number {
  if (method === 'EXPRESS') return EXPRESS_SHIPPING_COST_IN_CENTS;
  return subtotalInCents >= FREE_SHIPPING_THRESHOLD_IN_CENTS ? 0 : STANDARD_SHIPPING_COST_IN_CENTS;
}
