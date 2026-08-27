import type { OrderStatus } from '@asn/types';

/**
 * Cancelamento pelo próprio cliente só faz sentido ANTES do pedido sair
 * pra rua — uma vez `PROCESSING`/`SHIPPED`/`DELIVERED`, cancelar
 * unilateralmente não é mais uma operação segura sozinha (precisaria de um
 * fluxo de devolução/reembolso de verdade, fora de escopo aqui). Usado
 * tanto por `OrdersRepository.cancelByCustomer` (a ação em si, sempre
 * revalidada no servidor) quanto por `OrdersService` (só pra decidir o
 * `Order.canCancel` exposto na resposta) — uma fonte de verdade única
 * para "este status ainda permite cancelar", nunca duplicada nos dois
 * lugares.
 */
const CANCELLABLE_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'PAID'];

export function isOrderCancellableStatus(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}
