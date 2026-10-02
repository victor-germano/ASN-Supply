'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { Order, OrderStatus } from '@asn/types';
import { Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { updateAdminOrderAction } from '@/actions/adminOrders';

interface OrderStatusFormValues {
  status: OrderStatus;
  trackingCode: string;
  trackingUrl: string;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING_PAYMENT', label: 'Aguardando pagamento' },
  { value: 'PAID', label: 'Pago' },
  { value: 'PROCESSING', label: 'Em preparação' },
  { value: 'SHIPPED', label: 'Enviado' },
  { value: 'DELIVERED', label: 'Entregue' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'REFUND_REQUESTED', label: 'Reembolso solicitado' },
  { value: 'REFUNDED', label: 'Reembolsado' },
];

/**
 * Marcar como "Enviado" com um código de rastreio preenchido dispara um
 * e-mail pro cliente automaticamente (ver `OrdersService.updateForAdmin`
 * na API) — só na transição, não a cada salvamento subsequente.
 */
export function OrderStatusForm({ order }: { order: Order }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Sem isto o "Salvar" não dava retorno nenhum — marcar um PIX como pago
  // e não ter certeza se gravou é exatamente o erro que não pode acontecer.
  const [justSaved, setJustSaved] = useState(false);
  const { register, handleSubmit } = useForm<OrderStatusFormValues>({
    defaultValues: {
      status: order.status,
      trackingCode: order.trackingCode ?? '',
      trackingUrl: order.trackingUrl ?? '',
    },
  });

  async function onSubmit(values: OrderStatusFormValues) {
    setSubmitError(null);
    setJustSaved(false);
    setIsSubmitting(true);
    try {
      const result = await updateAdminOrderAction(order.id, {
        status: values.status,
        trackingCode: values.trackingCode.trim() || null,
        trackingUrl: values.trackingUrl.trim() || null,
      });
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      setJustSaved(true);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div>
        <label className={labelClassName} htmlFor="status">
          Status
        </label>
        <select id="status" className={inputClassName} {...register('status')}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClassName} htmlFor="trackingCode">
          Código de rastreio
        </label>
        <input id="trackingCode" className={inputClassName} {...register('trackingCode')} />
      </div>

      <div>
        <label className={labelClassName} htmlFor="trackingUrl">
          Link de rastreio
        </label>
        <input
          id="trackingUrl"
          type="url"
          placeholder="https://..."
          className={inputClassName}
          {...register('trackingUrl')}
        />
      </div>

      {submitError && (
        <Text size="sm" className="text-error" role="alert">
          {submitError}
        </Text>
      )}
      {justSaved && (
        <Text size="sm" role="status">
          Pedido atualizado. O cliente já vê o novo status.
        </Text>
      )}

      <Button type="submit" size="lg" isLoading={isSubmitting}>
        Salvar
      </Button>
    </form>
  );
}
