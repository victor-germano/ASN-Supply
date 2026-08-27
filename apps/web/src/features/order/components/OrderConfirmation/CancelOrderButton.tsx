'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Text } from '@asn/ui';
import { cancelOrderAction } from '@/actions/orders';

/**
 * Só é renderizado pelo pai (`OrderConfirmation`) quando `order.canCancel`
 * é `true` — mas a ação em si (`cancelOrderAction` → `POST
 * /orders/:id/cancel`) sempre revalida posse + status de novo no servidor,
 * então mesmo alguém forçando este botão a aparecer não conseguiria
 * cancelar um pedido que não é seu ou que já passou do prazo.
 */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (
      !window.confirm(
        'Cancelar este pedido? O estoque reservado é liberado e essa ação não pode ser desfeita.',
      )
    ) {
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      const result = await cancelOrderAction(orderId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-2 border-t border-ink/10 pt-4">
      {error && (
        <Text size="sm" className="text-error" role="alert">
          {error}
        </Text>
      )}
      <Button type="button" variant="secondary" isLoading={isPending} onClick={handleCancel}>
        Cancelar pedido
      </Button>
    </div>
  );
}
