import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Heading, Text } from '@asn/ui';
import type { OrderStatus } from '@asn/types';
import { getMyOrders } from '@/services/order.service';
import { formatMoney } from '@/lib/formatMoney';
import { ApiError } from '@/services/apiClient';

export const metadata: Metadata = {
  title: 'Meus Pedidos',
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

export default async function MeusPedidosPage() {
  // `conta/layout.tsx` já verificou a sessão antes de renderizar, mas faz
  // isso numa chamada independente (`GET /auth/me`) — em tese o token pode
  // parar de valer entre uma chamada e outra (ex: refresh também expirou
  // bem nesse intervalo). Sem este catch, essa borda rara vazaria como a
  // tela de erro genérica do Next em vez de simplesmente mandar pro login.
  let orders;
  try {
    orders = await getMyOrders();
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect('/entrar');
    }
    throw error;
  }

  if (orders.length === 0) {
    return (
      <div>
        <Heading as="h1" size="lg" className="mb-6">
          Meus pedidos
        </Heading>
        <Text tone="muted">
          Você ainda não fez nenhum pedido.{' '}
          <Link href="/produtos" className="text-ink underline underline-offset-4">
            Explorar produtos
          </Link>
        </Text>
      </div>
    );
  }

  return (
    <div>
      <Heading as="h1" size="lg" className="mb-6">
        Meus pedidos
      </Heading>
      <ul className="flex flex-col divide-y divide-ink/10">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/pedido/${order.id}`}
              className="flex items-center justify-between gap-4 py-4 transition-colors hover:text-olive-600"
            >
              <div>
                <Text size="sm" weight="semibold">
                  {order.code}
                </Text>
                <Text size="xs" tone="muted">
                  {new Date(order.createdAt).toLocaleDateString('pt-BR')} ·{' '}
                  {STATUS_LABEL[order.status]}
                </Text>
              </div>
              <Text size="sm">{formatMoney(order.total)}</Text>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
