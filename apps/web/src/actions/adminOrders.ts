'use server';

import { revalidatePath } from 'next/cache';
import type { Order, UpdateOrderInput } from '@asn/types';
import { ApiError } from '@/services/apiClient';
import { updateAdminOrder } from '@/services/order.service';

export type AdminOrderActionResult =
  { success: true; order: Order } | { success: false; message: string };

export async function updateAdminOrderAction(
  id: string,
  input: UpdateOrderInput,
): Promise<AdminOrderActionResult> {
  try {
    const order = await updateAdminOrder(id, input);
    revalidatePath('/admin/pedidos');
    revalidatePath(`/admin/pedidos/${id}`);
    return { success: true, order };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível salvar o pedido agora. Tente novamente em instantes.';
    return { success: false, message };
  }
}
