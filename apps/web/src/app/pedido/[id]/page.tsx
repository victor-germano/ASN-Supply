import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError } from '@/services/apiClient';
import { getOrder, getPaymentIntent } from '@/services/order.service';
import { PAYMENT_UNAVAILABLE_FALLBACK } from '@/lib/paymentFallback';
import { OrderConfirmation } from '@/features/order/components/OrderConfirmation/OrderConfirmation';

export const metadata: Metadata = {
  title: 'Confirmação do pedido',
  robots: { index: false, follow: false },
};

interface OrderConfirmationPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  const { id } = await params;

  // `getPaymentIntent` só depende do `id` da URL (não do pedido já
  // carregado), então roda em paralelo com `getOrder` em vez de esperar a
  // primeira chamada terminar para só então começar a segunda.
  // A etapa de pagamento é complementar: se ela falhar (limite de
  // requisições, instabilidade), o cliente ainda vê o pedido dele — com o
  // aviso genérico no lugar do PIX — em vez de uma página de erro inteira.
  // Só o 404 dela importa (mesma checagem de dono de `getOrder`).
  let order;
  let paymentIntent;
  try {
    [order, paymentIntent] = await Promise.all([
      getOrder(id),
      getPaymentIntent(id).catch((error: unknown) => {
        if (error instanceof ApiError && error.statusCode === 404) throw error;
        return PAYMENT_UNAVAILABLE_FALLBACK;
      }),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  return <OrderConfirmation order={order} paymentIntent={paymentIntent} />;
}
