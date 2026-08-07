import type { Money } from './common';
import type { CartItem } from './cart';

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

export interface Address {
  id: string;
  label: string;
  recipientName: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal: Money;
  shippingCost: Money;
  discount: Money | null;
  total: Money;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingAddress: Address;
  installments: number;
  createdAt: string;
  estimatedDeliveryAt: string | null;
}
