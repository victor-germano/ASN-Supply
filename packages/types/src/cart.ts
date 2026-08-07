import type { Money } from './common';

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  imageUrl: string;
  size: string;
  colorName: string;
  quantity: number;
  unitPrice: Money;
  subtotal: Money;
}

export interface AppliedCoupon {
  code: string;
  discountInCents: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: Money;
  shippingCost: Money | null;
  discount: Money | null;
  total: Money;
  coupon: AppliedCoupon | null;
}
