import Link from 'next/link';
import type { OrderStatus } from '@asn/types';
import { Badge, Heading, Text } from '@asn/ui';
import { getAdminDashboardStats } from '@/services/adminDashboard.service';
import { formatMoney } from '@/lib/formatMoney';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  PROCESSING: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  REFUND_REQUESTED: 'Reembolso solicitado',
  REFUNDED: 'Reembolsado',
};

const STATUS_TONE: Record<OrderStatus, 'neutral' | 'olive' | 'outline' | 'error'> = {
  PENDING_PAYMENT: 'outline',
  PAID: 'olive',
  PROCESSING: 'olive',
  SHIPPED: 'olive',
  DELIVERED: 'neutral',
  CANCELLED: 'error',
  REFUND_REQUESTED: 'error',
  REFUNDED: 'error',
};

/**
 * Primeira tela que um admin vê ao entrar — até aqui era um placeholder
 * fixo desde a fundação do painel (Módulo 6), que ficou dizendo "CRUD de
 * produtos/pedidos/clientes ainda não foi construído" muito depois de
 * tudo isso já existir. `GET /admin/dashboard` (`AdminDashboardModule`)
 * agrega o que já está no banco — nenhuma tabela nova, só somar/contar o
 * que os outros módulos (Pedidos, Clientes, Produtos) já gravam.
 */
export default async function AdminPage() {
  const stats = await getAdminDashboardStats();

  return (
    <div>
      <Heading as="h1" size="lg" className="mb-6">
        Painel administrativo
      </Heading>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Faturamento" value={formatMoney(stats.revenue)} />
        <StatCard label="Pedidos" value={String(stats.totalOrders)} />
        <StatCard label="Aguardando pagamento" value={String(stats.pendingOrders)} />
        <StatCard label="Clientes" value={String(stats.totalCustomers)} />
      </div>

      <Text tone="muted" className="mb-8 text-sm">
        {stats.totalProducts}{' '}
        {stats.totalProducts === 1 ? 'produto publicado' : 'produtos publicados'}
        {' · '}
        <Link href="/admin/produtos" className="underline underline-offset-4 hover:text-ink">
          gerenciar catálogo
        </Link>
      </Text>

      <Heading as="h2" size="sm" className="mb-4">
        Últimos pedidos
      </Heading>
      {stats.recentOrders.length === 0 ? (
        <Text tone="muted">Nenhum pedido ainda.</Text>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/10 border-t border-ink/10">
          {stats.recentOrders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/admin/pedidos/${order.id}`}
                className="flex items-center justify-between gap-4 py-3 text-sm transition-colors hover:text-olive-600"
              >
                <span className="flex-1">
                  {order.code} <span className="text-ink-muted">· {order.guestName}</span>
                </span>
                <span>{formatMoney(order.total)}</span>
                <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/10 p-4">
      <Text size="xs" tone="muted" className="mb-1 uppercase tracking-wider">
        {label}
      </Text>
      <Text weight="semibold" size="lg">
        {value}
      </Text>
    </div>
  );
}
