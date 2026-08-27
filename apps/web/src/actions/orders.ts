'use server';

import { revalidatePath } from 'next/cache';
import type { Order } from '@asn/types';
import { ApiError } from '@/services/apiClient';
import { cancelOrder } from '@/services/order.service';

export type CancelOrderActionResult =
  { success: true; order: Order } | { success: false; message: string };

/**
 * Invalida tanto a própria página de confirmação (`/pedido/[id]`, o status
 * badge muda para "Cancelado") quanto o histórico (`/conta/pedidos`, a
 * listagem também precisa refletir o novo status) — as duas telas mostram
 * o mesmo pedido de formas diferentes.
 */
export async function cancelOrderAction(orderId: string): Promise<CancelOrderActionResult> {
  try {
    const order = await cancelOrder(orderId);
    revalidatePath(`/pedido/${orderId}`);
    revalidatePath('/conta/pedidos');
    return { success: true, order };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível cancelar o pedido agora. Tente novamente em instantes.';
    return { success: false, message };
  }
}
