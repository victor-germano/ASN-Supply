import Image from 'next/image';
import { Heading, Text } from '@asn/ui';
import type { CartItem } from '@/stores/cartStore';
import { formatMoney } from '@/lib/formatMoney';

interface OrderSummaryProps {
  items: CartItem[];
  shippingCostInCents: number | null;
}

export function OrderSummary({ items, shippingCostInCents }: OrderSummaryProps) {
  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.unitPriceInCents * item.quantity,
    0,
  );
  const totalInCents = subtotalInCents + (shippingCostInCents ?? 0);

  return (
    <aside className="h-fit border border-ink/10 p-6">
      <Heading as="h2" size="sm" className="mb-4">
        Seu pedido
      </Heading>

      <ul className="flex flex-col gap-4 border-b border-ink/10 pb-4">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-3">
            <div className="relative h-16 w-14 shrink-0 bg-bone-200">
              <Image
                src={item.imageUrl}
                alt={item.productName}
                fill
                sizes="56px"
                className="object-cover"
              />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] text-white">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1">
              <Text size="sm" weight="medium" className="line-clamp-1">
                {item.productName}
              </Text>
              <Text size="xs" tone="muted">
                {item.colorName} · Tam. {item.size}
              </Text>
            </div>
            <Text size="sm">
              {formatMoney({
                amountInCents: item.unitPriceInCents * item.quantity,
                currency: 'BRL',
              })}
            </Text>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 pt-4">
        <div className="flex items-center justify-between">
          <Text size="sm" tone="muted">
            Subtotal
          </Text>
          <Text size="sm">{formatMoney({ amountInCents: subtotalInCents, currency: 'BRL' })}</Text>
        </div>
        <div className="flex items-center justify-between">
          <Text size="sm" tone="muted">
            Frete
          </Text>
          <Text size="sm">
            {shippingCostInCents === null
              ? 'Calculado na próxima etapa'
              : shippingCostInCents === 0
                ? 'Grátis'
                : formatMoney({ amountInCents: shippingCostInCents, currency: 'BRL' })}
          </Text>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-3">
          <Text weight="semibold">Total</Text>
          <Text weight="semibold" size="lg">
            {formatMoney({ amountInCents: totalInCents, currency: 'BRL' })}
          </Text>
        </div>
      </div>
    </aside>
  );
}
