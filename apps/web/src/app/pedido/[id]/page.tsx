import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError } from '@/services/apiClient';
import { getOrder, getPaymentIntent } from '@/services/order.service';
import { OrderConfirmation } from '@/features/order/components/OrderConfirmation/OrderConfirmation';

export const metadata: Metadata = {
  title: 'Confirmação do pedido — ASN Supply',
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
  let order;
  let paymentIntent;
  try {
    [order, paymentIntent] = await Promise.all([getOrder(id), getPaymentIntent(id)]);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  return <OrderConfirmation order={order} paymentIntent={paymentIntent} />;
}
