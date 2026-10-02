import type { Money } from './common';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUND_REQUESTED'
  | 'REFUNDED';

export type PaymentMethod = 'CREDIT_CARD' | 'PIX' | 'MERCADO_PAGO';

export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'REFUNDED';

export type ShippingMethod = 'STANDARD' | 'EXPRESS';

/**
 * Endereço de entrega — sempre uma cópia (não uma referência): tanto no
 * checkout como convidado (Módulo 4, sem conta) quanto, futuramente, quando
 * um cliente autenticado escolher um endereço salvo, o pedido guarda os
 * dados como estavam no momento da compra. Editar/apagar o endereço salvo
 * depois não pode alterar um pedido já feito.
 */
export interface ShippingAddress {
  recipientName: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface OrderItem {
  id: string;
  /** `null` quando o produto/variante foi excluído do catálogo depois da compra — o resto do item é uma cópia e continua valendo. */
  productId: string | null;
  productSlug: string;
  productName: string;
  variantId: string | null;
  imageUrl: string;
  size: string;
  colorName: string;
  quantity: number;
  unitPrice: Money;
}

export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: Money;
  shippingCost: Money;
  discount: Money;
  total: Money;
  shippingMethod: ShippingMethod;
  shippingAddress: ShippingAddress;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  installments: number;
  createdAt: string;
  estimatedDeliveryAt: string | null;
  /** Preenchidos manualmente pelo admin — `null` até o pedido ser marcado como enviado (ver Painel Admin). */
  trackingCode: string | null;
  trackingUrl: string | null;
  /**
   * Calculado pelo servidor (nunca deduzido no client) a partir de quem
   * está vendo o pedido AGORA + o status atual — combina "é o dono deste
   * pedido" e "o status ainda permite cancelar" numa coisa só, pra
   * `OrderConfirmation` não precisar reimplementar nenhuma das duas
   * regras (a segunda checagem sozinha, sem a primeira, mostraria o botão
   * pra qualquer convidado com o link do pedido de outra pessoa). A ação
   * de cancelar em si (`POST /orders/:id/cancel`) sempre revalida os dois
   * de novo no servidor — isto aqui é só pra decidir mostrar o botão.
   */
  canCancel: boolean;
}

/**
 * Entrada do checkout (guest, Módulo 4): o client manda só a intenção de
 * compra (quais variantes + quantidade, contato, endereço). Preço e estoque
 * NUNCA vêm do client — o servidor sempre re-busca `ProductVariant` no banco
 * para montar o pedido, senão um client adulterado poderia mandar qualquer
 * preço.
 */
export interface CreateOrderItemInput {
  variantId: string;
  quantity: number;
}

export interface CreateOrderInput {
  items: CreateOrderItemInput[];
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  /**
   * Endereço salvo do cliente autenticado (Módulo 5) — quando presente, o
   * servidor busca o `Address` (escopado ao próprio usuário) e denormaliza
   * os campos no pedido; alternativa a `shippingAddress`, nunca as duas.
   */
  addressId?: string;
  shippingAddress?: ShippingAddress;
  shippingMethod: ShippingMethod;
  /** Código de um cupom validado no preview (`POST /coupons/validate`) — reaplicado e revalidado atomicamente na hora de confirmar o pedido, nunca confia no desconto calculado no navegador. */
  couponCode?: string;
}

/** Resultado de `POST /coupons/validate` — só um preview, não gasta o uso do cupom. */
export interface CouponPreview {
  code: string;
  discountInCents: number;
}

/** Painel Admin — atualização de status + rastreio (`PATCH /orders/:id`, `@Roles('ADMIN')`). */
export interface UpdateOrderInput {
  status?: OrderStatus;
  trackingCode?: string | null;
  trackingUrl?: string | null;
}

/**
 * PIX "estático" com a chave da loja — sem gateway, sem confirmação
 * automática: o cliente paga pelo app do banco e o admin marca o pedido
 * como Pago ao ver o dinheiro entrar (ver `PixPaymentGateway` na API).
 */
export interface PixPaymentDetails {
  /** BR Code "copia e cola" — o mesmo conteúdo do QR Code. */
  copyPasteCode: string;
  receiverName: string;
  amountInCents: number;
}

/**
 * Resultado do "início de pagamento". `available: false` quando nenhum
 * meio está configurado (`NullPaymentGateway`) ou o pedido não está mais
 * aguardando pagamento; `pix` preenchido quando o meio é PIX.
 */
export interface PaymentIntentResult {
  available: boolean;
  method: PaymentMethod | null;
  providerReference: string | null;
  clientSecret: string | null;
  pix: PixPaymentDetails | null;
  message: string;
}
