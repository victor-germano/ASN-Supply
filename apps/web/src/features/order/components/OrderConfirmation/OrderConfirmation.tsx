import Image from 'next/image';
import Link from 'next/link';
import type { Order, PaymentIntentResult } from '@asn/types';
import { Badge, Container, Heading, Text, buttonStyles } from '@asn/ui';
import { formatMoney } from '@/lib/formatMoney';
import { CreditCardIcon, TruckIcon } from '@/components/icons';

const STATUS_LABEL: Record<Order['status'], string> = {
  PENDING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  PROCESSING: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  REFUND_REQUESTED: 'Reembolso solicitado',
  REFUNDED: 'Reembolsado',
};

const SHIPPING_METHOD_LABEL: Record<Order['shippingMethod'], string> = {
  STANDARD: 'Padrão (5 a 8 dias úteis)',
  EXPRESS: 'Expressa (1 a 2 dias úteis)',
};

const PAYMENT_METHODS: { label: string }[] = [
  { label: 'Cartão de crédito' },
  { label: 'PIX' },
  { label: 'Mercado Pago' },
];

export function OrderConfirmation({
  order,
  paymentIntent,
}: {
  order: Order;
  paymentIntent: PaymentIntentResult;
}) {
  return (
    <main className="bg-bone-100">
      <Container className="py-section">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <Text size="sm" tone="muted" className="mb-2 uppercase tracking-wider">
              Pedido {order.code}
            </Text>
            <Heading as="h1" size="lg" className="mb-3">
              Recebemos seu pedido
            </Heading>
            <Badge tone="olive">{STATUS_LABEL[order.status]}</Badge>
          </div>

          <div className="border border-ink/10 p-6">
            <Heading as="h2" size="sm" className="mb-4">
              Itens
            </Heading>
            <ul className="flex flex-col gap-4 divide-y divide-ink/10">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 pt-4 first:pt-0">
                  <Link
                    href={`/produtos/${item.productSlug}`}
                    className="relative h-20 w-16 shrink-0 bg-bone-200"
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.productName}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <Text weight="medium">{item.productName}</Text>
                      <Text size="sm" tone="muted">
                        {item.colorName} · Tam. {item.size} · Qtd. {item.quantity}
                      </Text>
                    </div>
                    <Text weight="medium">
                      {formatMoney({
                        amountInCents: item.unitPrice.amountInCents * item.quantity,
                        currency: 'BRL',
                      })}
                    </Text>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-2 border-t border-ink/10 pt-4">
              <div className="flex items-center justify-between">
                <Text size="sm" tone="muted">
                  Subtotal
                </Text>
                <Text size="sm">{formatMoney(order.subtotal)}</Text>
              </div>
              <div className="flex items-center justify-between">
                <Text size="sm" tone="muted">
                  Frete
                </Text>
                <Text size="sm">
                  {order.shippingCost.amountInCents === 0
                    ? 'Grátis'
                    : formatMoney(order.shippingCost)}
                </Text>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-3">
                <Text weight="semibold">Total</Text>
                <Text weight="semibold" size="lg">
                  {formatMoney(order.total)}
                </Text>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="border border-ink/10 p-6">
              <Heading as="h2" size="sm" className="mb-3 flex items-center gap-2">
                <TruckIcon className="h-4 w-4" />
                Entrega
              </Heading>
              <Text size="sm">{order.shippingAddress.recipientName}</Text>
              <Text size="sm" tone="muted">
                {order.shippingAddress.street}, {order.shippingAddress.number}
                {order.shippingAddress.complement ? ` — ${order.shippingAddress.complement}` : ''}
              </Text>
              <Text size="sm" tone="muted">
                {order.shippingAddress.neighborhood}, {order.shippingAddress.city} —{' '}
                {order.shippingAddress.state}
              </Text>
              <Text size="sm" tone="muted">
                CEP {order.shippingAddress.zipCode}
              </Text>
              <Text size="sm" className="mt-2">
                {SHIPPING_METHOD_LABEL[order.shippingMethod]}
              </Text>
            </div>

            <div className="border border-ink/10 p-6">
              <Heading as="h2" size="sm" className="mb-3 flex items-center gap-2">
                <CreditCardIcon className="h-4 w-4" />
                Pagamento
              </Heading>
              <Text size="sm" tone="muted" className="mb-4">
                {paymentIntent.message}
              </Text>
              <div className="flex flex-col gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <div
                    key={method.label}
                    aria-disabled="true"
                    className="flex items-center justify-between border border-ink/10 px-4 py-2.5 opacity-50"
                  >
                    <Text size="sm">{method.label}</Text>
                    <Text size="xs" tone="muted" className="uppercase tracking-wider">
                      Em breve
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <Text size="sm" tone="muted">
              Enviamos os detalhes para <strong>{order.guestEmail}</strong>.
            </Text>
            <Link href="/produtos" className={buttonStyles({ variant: 'secondary', size: 'md' })}>
              Continuar comprando
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
