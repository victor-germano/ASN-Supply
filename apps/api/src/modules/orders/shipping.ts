import type { ShippingMethod } from '@asn/types';

const FREE_SHIPPING_THRESHOLD_IN_CENTS = 50_000;
const STANDARD_SHIPPING_COST_IN_CENTS = 2_990;
const EXPRESS_SHIPPING_COST_IN_CENTS = 5_990;

/**
 * Tabela de frete fixa (Módulo 4) — sem integração com transportadora nem
 * cálculo por CEP ainda, mesmo espírito de "base pronta para evoluir depois"
 * aplicado ao pagamento: qualquer regra de frete real (Correios, Melhor
 * Envio etc.) troca só esta função, o resto do checkout não muda.
 */
export function calculateShippingCostInCents(
  method: ShippingMethod,
  subtotalInCents: number,
): number {
  if (method === 'EXPRESS') return EXPRESS_SHIPPING_COST_IN_CENTS;
  return subtotalInCents >= FREE_SHIPPING_THRESHOLD_IN_CENTS ? 0 : STANDARD_SHIPPING_COST_IN_CENTS;
}
