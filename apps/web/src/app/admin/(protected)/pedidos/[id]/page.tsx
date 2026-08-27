import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading, Text } from '@asn/ui';
import { getOrder } from '@/services/order.service';
import { ApiError } from '@/services/apiClient';
import { formatMoney } from '@/lib/formatMoney';
import { OrderStatusForm } from '@/features/admin/components/OrderStatusForm/OrderStatusForm';

export const metadata: Metadata = {
  title: 'Pedido — Administração',
  robots: { index: false, follow: false },
};

export default async function AdminPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let order;
  try {
    order = await getOrder(id);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  return (
    <div>
      <Heading as="h1" size="lg" className="mb-1">
        Pedido {order.code}
      </Heading>
      <Text tone="muted" className="mb-8">
        {order.guestName} · {order.guestEmail} · {order.guestPhone}
      </Text>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <ul className="mb-6 flex flex-col gap-3 divide-y divide-ink/10 border border-ink/10 p-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 pt-3 first:pt-0">
                <div>
                  <Text size="sm" weight="medium">
                    {item.productName}
                  </Text>
                  <Text size="xs" tone="muted">
                    {item.colorName} · Tam. {item.size} · Qtd. {item.quantity}
                  </Text>
                </div>
                <Text size="sm">
                  {formatMoney({
                    amountInCents: item.unitPrice.amountInCents * item.quantity,
                    currency: 'BRL',
                  })}
                </Text>
              </li>
            ))}
          </ul>

          <div className="border border-ink/10 p-4">
            <Text
              size="xs"
              weight="semibold"
              className="mb-2 uppercase tracking-wider text-ink-muted"
            >
              Entrega
            </Text>
            <Text size="sm">{order.shippingAddress.recipientName}</Text>
            <Text size="sm" tone="muted">
              {order.shippingAddress.street}, {order.shippingAddress.number}
              {order.shippingAddress.complement ? ` — ${order.shippingAddress.complement}` : ''}
            </Text>
            <Text size="sm" tone="muted">
              {order.shippingAddress.neighborhood}, {order.shippingAddress.city} —{' '}
              {order.shippingAddress.state}, CEP {order.shippingAddress.zipCode}
            </Text>
          </div>
        </div>

        <OrderStatusForm order={order} />
      </div>
    </div>
  );
}
