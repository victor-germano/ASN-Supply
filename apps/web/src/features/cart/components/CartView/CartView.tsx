'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Container, Heading, Text, buttonStyles } from '@asn/ui';
import { useCartStore } from '@/stores/cartStore';
import { formatMoney } from '@/lib/formatMoney';
import { CloseIcon } from '@/components/icons';

function QuantityStepper({ variantId, quantity }: { variantId: string; quantity: number }) {
  const setQuantity = useCartStore((state) => state.setQuantity);

  return (
    <div className="flex items-center border border-ink/15">
      <button
        type="button"
        onClick={() => setQuantity(variantId, quantity - 1)}
        aria-label="Diminuir quantidade"
        className="flex h-8 w-8 items-center justify-center text-ink hover:bg-bone-200"
      >
        −
      </button>
      <span className="w-8 text-center text-sm" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity(variantId, quantity + 1)}
        aria-label="Aumentar quantidade"
        className="flex h-8 w-8 items-center justify-center text-ink hover:bg-bone-200"
      >
        +
      </button>
    </div>
  );
}

export function CartView() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);

  if (items.length === 0) {
    return (
      <main className="flex min-h-[70dvh] flex-col items-center justify-center bg-bone-100">
        <Container className="flex flex-col items-center gap-6 py-section text-center">
          <Heading as="h1" size="lg">
            Seu carrinho está vazio
          </Heading>
          <Text tone="muted" className="max-w-md">
            Explore os lançamentos e coleções da ASN Supply e encontre o próximo par para a sua
            rotação.
          </Text>
          <Link href="/" className={buttonStyles({ size: 'md' })}>
            Continuar explorando
          </Link>
        </Container>
      </main>
    );
  }

  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.unitPriceInCents * item.quantity,
    0,
  );

  return (
    <main className="bg-bone-100">
      <Container className="py-section">
        <Heading as="h1" size="lg" className="mb-10">
          Carrinho
        </Heading>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
          <ul className="flex flex-col divide-y divide-ink/10">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-4 py-6">
                <Link
                  href={`/produtos/${item.productSlug}`}
                  className="relative h-28 w-24 shrink-0 bg-bone-200"
                >
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </Link>

                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/produtos/${item.productSlug}`}>
                        <Text weight="medium">{item.productName}</Text>
                      </Link>
                      <Text size="sm" tone="muted">
                        {item.colorName} · Tam. {item.size}
                      </Text>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.variantId)}
                      aria-label={`Remover ${item.productName} do carrinho`}
                      className="text-ink-muted hover:text-ink"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <QuantityStepper variantId={item.variantId} quantity={item.quantity} />
                    <Text weight="medium">
                      {formatMoney({
                        amountInCents: item.unitPriceInCents * item.quantity,
                        currency: 'BRL',
                      })}
                    </Text>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit border border-ink/10 p-6">
            <Heading as="h2" size="sm" className="mb-4">
              Resumo
            </Heading>
            <div className="flex items-center justify-between border-t border-ink/10 pt-4">
              <Text tone="muted">Subtotal</Text>
              <Text weight="semibold">
                {formatMoney({ amountInCents: subtotalInCents, currency: 'BRL' })}
              </Text>
            </div>
            <Text size="xs" tone="muted" className="mt-2">
              Frete calculado no checkout.
            </Text>
            <Link
              href="/checkout"
              className={buttonStyles({ size: 'lg', fullWidth: true, className: 'mt-6' })}
            >
              Finalizar Compra
            </Link>
          </aside>
        </div>
      </Container>
    </main>
  );
}
