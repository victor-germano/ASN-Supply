import { useState } from 'react';
import Image from 'next/image';
import type { CouponPreview } from '@asn/types';
import { Heading, Text, Button } from '@asn/ui';
import type { CartItem } from '@/stores/cartStore';
import { formatMoney } from '@/lib/formatMoney';
import { inputClassName } from '@/components/form/formStyles';
import { validateCouponAction } from '@/actions/checkout';

interface OrderSummaryProps {
  items: CartItem[];
  shippingCostInCents: number | null;
  appliedCoupon: CouponPreview | null;
  onCouponChange: (coupon: CouponPreview | null) => void;
}

export function OrderSummary({
  items,
  shippingCostInCents,
  appliedCoupon,
  onCouponChange,
}: OrderSummaryProps) {
  const [couponInput, setCouponInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.unitPriceInCents * item.quantity,
    0,
  );
  const discountInCents = appliedCoupon?.discountInCents ?? 0;
  const totalInCents = subtotalInCents + (shippingCostInCents ?? 0) - discountInCents;

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponError(null);
    setIsValidating(true);
    try {
      const result = await validateCouponAction(couponInput.trim(), subtotalInCents);
      if (!result.success) {
        setCouponError(result.message);
        return;
      }
      onCouponChange(result.coupon);
      setCouponInput('');
    } finally {
      setIsValidating(false);
    }
  }

  function handleRemoveCoupon() {
    onCouponChange(null);
    setCouponError(null);
  }

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

      <div className="border-b border-ink/10 py-4">
        {appliedCoupon ? (
          <div className="flex items-center justify-between gap-2">
            <Text size="sm">
              Cupom <strong>{appliedCoupon.code}</strong> aplicado
            </Text>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="text-xs text-ink-muted underline underline-offset-4 hover:text-error"
            >
              Remover
            </button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                placeholder="Cupom de desconto"
                className={inputClassName}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                isLoading={isValidating}
                disabled={!couponInput.trim()}
                onClick={handleApplyCoupon}
              >
                Aplicar
              </Button>
            </div>
            {couponError && (
              <Text size="xs" className="mt-2 text-error" role="alert">
                {couponError}
              </Text>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-4">
        <div className="flex items-center justify-between">
          <Text size="sm" tone="muted">
            Subtotal
          </Text>
          <Text size="sm">{formatMoney({ amountInCents: subtotalInCents, currency: 'BRL' })}</Text>
        </div>
        {discountInCents > 0 && (
          <div className="flex items-center justify-between">
            <Text size="sm" tone="muted">
              Desconto
            </Text>
            <Text size="sm" className="text-olive-600">
              -{formatMoney({ amountInCents: discountInCents, currency: 'BRL' })}
            </Text>
          </div>
        )}
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
