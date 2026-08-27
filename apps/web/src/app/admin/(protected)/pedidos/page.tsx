import type { Metadata } from 'next';
import Link from 'next/link';
import type { OrderStatus } from '@asn/types';
import { Badge, Heading, Text } from '@asn/ui';
import { getAdminOrders } from '@/services/order.service';
import { formatMoney } from '@/lib/formatMoney';

export const metadata: Metadata = {
  title: 'Pedidos — Administração',
  robots: { index: false, follow: false },
};

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

const ALL_STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const status = ALL_STATUSES.includes(params.status as OrderStatus)
    ? (params.status as OrderStatus)
    : undefined;
  const result = await getAdminOrders({ page, pageSize: 20, status });

  return (
    <div>
      <Heading as="h1" size="lg" className="mb-6">
        Pedidos
      </Heading>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/pedidos"
          className={`px-3 py-1.5 text-xs uppercase tracking-wider ${!status ? 'bg-ink text-white' : 'border border-ink/15 text-ink-muted'}`}
        >
          Todos
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/pedidos?status=${s}`}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider ${status === s ? 'bg-ink text-white' : 'border border-ink/15 text-ink-muted'}`}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <Text tone="muted">Nenhum pedido encontrado.</Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink-muted">
                <th className="py-3 pr-4">Pedido</th>
                <th className="py-3 pr-4">Cliente</th>
                <th className="py-3 pr-4">Data</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((order) => (
                <tr key={order.id} className="border-b border-ink/5">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/pedidos/${order.id}`} className="hover:text-olive-600">
                      {order.code}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-ink-muted">{order.guestEmail}</td>
                  <td className="py-3 pr-4 text-ink-muted">
                    {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 pr-4">{formatMoney(order.total)}</td>
                  <td className="py-3 pr-4">
                    <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="mt-6 flex items-center gap-4 text-sm">
          {page > 1 && (
            <Link href={`/admin/pedidos?page=${page - 1}${status ? `&status=${status}` : ''}`}>
              ← Anterior
            </Link>
          )}
          <span className="text-ink-muted">
            Página {result.page} de {result.totalPages}
          </span>
          {page < result.totalPages && (
            <Link href={`/admin/pedidos?page=${page + 1}${status ? `&status=${status}` : ''}`}>
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
