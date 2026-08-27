import type { ShippingAddress } from './order';

/**
 * Endereço salvo de um cliente autenticado. Reaproveita os mesmos campos de
 * `ShippingAddress` (Módulo 4) — no checkout, um `Address` escolhido é
 * denormalizado exatamente nesse shape dentro do pedido; editar/apagar o
 * endereço depois não altera pedidos já feitos (ver comentário em order.ts).
 */
export interface Address extends ShippingAddress {
  id: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateAddressInput extends Omit<ShippingAddress, 'complement'> {
  label: string;
  // Opcional (não `string | null` como em `ShippingAddress`) — o form de
  // endereço simplesmente omite o campo quando vazio, mesma dualidade já
  // usada em `ShippingAddressDto` (apps/api) para o checkout.
  complement?: string;
  isDefault?: boolean;
}

export type UpdateAddressInput = Partial<CreateAddressInput>;
