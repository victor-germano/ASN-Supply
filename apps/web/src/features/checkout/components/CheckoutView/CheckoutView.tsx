'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { Address, CouponPreview } from '@asn/types';
import { Button, Container, Heading, buttonStyles } from '@asn/ui';
import Link from 'next/link';
import { useCartStore } from '@/stores/cartStore';
import { createOrderAction } from '@/actions/checkout';
import { previewShippingCostInCents } from '../../utils/shippingPreview';
import { CheckoutStepper } from './CheckoutStepper';
import { CHECKOUT_STEPS, STEP_FIELDS, type CheckoutStep } from './steps';
import { CHECKOUT_FORM_DEFAULTS, type CheckoutFormValues } from './CheckoutFormValues';
import { ContactAddressStep } from './ContactAddressStep';
import { ShippingMethodStep } from './ShippingMethodStep';
import { ReviewStep } from './ReviewStep';
import { OrderSummary } from './OrderSummary';

export function CheckoutView() {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const clearCart = useCartStore((state) => state.clear);
  const router = useRouter();

  const [step, setStep] = useState<CheckoutStep>('contato');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreview | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const {
    register,
    watch,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({ defaultValues: CHECKOUT_FORM_DEFAULTS, mode: 'onBlur' });

  /**
   * Endereço salvo escolhido no `AddressSelector`: os campos digitados
   * (ocultos nesse caso, ver `ContactAddressStep`) recebem os mesmos
   * valores via `setValue` — não é só cosmético, é o que faz `trigger()`
   * (validação da etapa "contato" antes de avançar) e o resumo do
   * `ReviewStep` continuarem funcionando sem precisar saber nada sobre
   * endereço salvo. O pedido em si, porém, vai com `addressId` (ver
   * `handleConfirmOrder`), nunca com esses valores copiados — evita
   * mandar pro servidor uma cópia que pode estar desatualizada em
   * relação ao endereço salvo de verdade.
   *
   * Voltar para "digitar outro endereço" (`address === null`) limpa os
   * campos em vez de deixar o valor do endereço salvo anterior parado
   * ali: sem isso, `selectedAddressId` viraria `null` mas os campos
   * ficariam com dado válido (não vazio) da seleção anterior — o pedido
   * sairia com o endereço salvo antigo disfarçado de "digitado".
   */
  function handleSelectAddress(address: Address | null) {
    setValue('recipientName', address?.recipientName ?? '');
    setValue('street', address?.street ?? '');
    setValue('number', address?.number ?? '');
    setValue('complement', address?.complement ?? '');
    setValue('neighborhood', address?.neighborhood ?? '');
    setValue('city', address?.city ?? '');
    setValue('state', address?.state ?? '');
    setValue('zipCode', address?.zipCode ?? '');
    setSelectedAddressId(address?.id ?? null);
  }

  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.unitPriceInCents * item.quantity,
    0,
  );
  const shippingMethod = watch('shippingMethod');
  const shippingCostInCents =
    step === 'contato' ? null : previewShippingCostInCents(shippingMethod, subtotalInCents);

  // Zustand com `persist` só reidrata depois do primeiro paint no cliente
  // (ver StoreHydration) — antes disso `items` sempre começa `[]`, então
  // redirecionar para o carrinho vazio antes de hidratar mandaria embora
  // quem tem itens de verdade. Nada é renderizado até `hasHydrated`.
  if (!hasHydrated) return null;

  if (items.length === 0) {
    return (
      <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 bg-bone-100 text-center">
        <Heading as="h1" size="lg">
          Seu carrinho está vazio
        </Heading>
        <Link href="/produtos" className={buttonStyles({ size: 'md' })}>
          Ver produtos
        </Link>
      </main>
    );
  }

  async function goToNextStep() {
    const isValid = await trigger(STEP_FIELDS[step] as (keyof CheckoutFormValues)[]);
    if (!isValid) return;
    const currentIndex = CHECKOUT_STEPS.findIndex((s) => s.id === step);
    const next = CHECKOUT_STEPS[currentIndex + 1];
    if (next) setStep(next.id);
  }

  function goToPreviousStep() {
    const currentIndex = CHECKOUT_STEPS.findIndex((s) => s.id === step);
    const previous = CHECKOUT_STEPS[currentIndex - 1];
    if (previous) setStep(previous.id);
  }

  async function handleConfirmOrder() {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const values = getValues();
      const result = await createOrderAction({
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        guestName: values.guestName,
        guestEmail: values.guestEmail,
        guestPhone: values.guestPhone,
        // Endereço salvo escolhido: manda só o `addressId`, nunca os
        // campos digitados (que existem só pra validação/resumo, ver
        // `handleSelectAddress`) — o servidor relê o endereço salvo
        // direto do banco na hora de montar o pedido.
        ...(selectedAddressId
          ? { addressId: selectedAddressId }
          : {
              shippingAddress: {
                recipientName: values.recipientName,
                street: values.street,
                number: values.number,
                complement: values.complement || null,
                neighborhood: values.neighborhood,
                city: values.city,
                state: values.state,
                zipCode: values.zipCode,
              },
            }),
        shippingMethod: values.shippingMethod,
        couponCode: appliedCoupon?.code,
      });

      if (!result.success) {
        setSubmitError(result.message);
        return;
      }

      clearCart();
      router.push(`/pedido/${result.order.id}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bg-bone-100">
      <Container className="py-section">
        <Heading as="h1" size="lg" className="mb-2">
          Checkout
        </Heading>
        <CheckoutStepper currentStep={step} />

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            {step === 'contato' && (
              <ContactAddressStep
                register={register}
                errors={errors}
                selectedAddressId={selectedAddressId}
                onSelectAddress={handleSelectAddress}
              />
            )}
            {step === 'frete' && (
              <ShippingMethodStep
                register={register}
                watch={watch}
                subtotalInCents={subtotalInCents}
              />
            )}
            {step === 'revisao' && (
              <ReviewStep
                values={getValues()}
                errorMessage={submitError}
                isSubmitting={isSubmitting}
                onSubmit={handleConfirmOrder}
              />
            )}

            {step !== 'revisao' && (
              <div className="mt-8 flex items-center justify-between">
                {step !== 'contato' ? (
                  <Button variant="secondary" size="md" type="button" onClick={goToPreviousStep}>
                    Voltar
                  </Button>
                ) : (
                  <Link
                    href="/carrinho"
                    className={buttonStyles({ variant: 'secondary', size: 'md' })}
                  >
                    Voltar ao carrinho
                  </Link>
                )}
                <Button size="md" type="button" onClick={goToNextStep}>
                  Continuar
                </Button>
              </div>
            )}
            {step === 'revisao' && (
              <div className="mt-4">
                <Button variant="ghost" size="md" type="button" onClick={goToPreviousStep}>
                  Voltar
                </Button>
              </div>
            )}
          </div>

          <OrderSummary
            items={items}
            shippingCostInCents={shippingCostInCents}
            appliedCoupon={appliedCoupon}
            onCouponChange={setAppliedCoupon}
          />
        </div>
      </Container>
    </main>
  );
}
