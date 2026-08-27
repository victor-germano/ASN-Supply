import type { OrderStatus } from '@asn/types';

/**
 * O que conta como faturamento no dashboard (`AdminDashboardRepository`).
 * Um pedido só passa a ser venda de verdade a partir de `PAID` — em
 * `PENDING_PAYMENT` ainda é só uma intenção de compra registrada, nunca
 * paga (mesmo raciocínio de `NullPaymentGateway`: sem pagamento
 * confirmado, não houve venda). `CANCELLED`/`REFUND_REQUESTED`/
 * `REFUNDED` também ficam de fora — um pedido cancelado ou estornado não
 * é receita, mesmo que tenha passado por `PAID` antes.
 *
 * Isolado num arquivo próprio (mesmo padrão de `orders/cancellation.ts`
 * pra `isOrderCancellableStatus`) pra ser uma fonte de verdade única e
 * testável isoladamente — a query de agregação em si (`Prisma.aggregate`)
 * não itera pedido por pedido pra poder chamar isto direto, mas usa a
 * mesma lista que baseia esta função, então os dois nunca divergem.
 */
const REVENUE_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

export function isRevenueStatus(status: OrderStatus): boolean {
  return REVENUE_STATUSES.includes(status);
}

export function revenueStatusList(): OrderStatus[] {
  return [...REVENUE_STATUSES];
}
