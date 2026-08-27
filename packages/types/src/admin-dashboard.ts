import type { Money } from './common';
import type { OrderStatus } from './order';

export interface AdminDashboardRecentOrder {
  id: string;
  code: string;
  status: OrderStatus;
  total: Money;
  guestName: string;
  createdAt: string;
}

/**
 * `GET /admin/dashboard` — visão geral pra `/admin` (Painel), a primeira
 * tela que um admin vê ao entrar. `revenue` soma só pedidos que já
 * passaram de `PENDING_PAYMENT` (`PAID`/`PROCESSING`/`SHIPPED`/
 * `DELIVERED`) — um carrinho abandonado em "aguardando pagamento" não é
 * faturamento de verdade ainda.
 */
export interface AdminDashboardStats {
  revenue: Money;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalProducts: number;
  recentOrders: AdminDashboardRecentOrder[];
}
