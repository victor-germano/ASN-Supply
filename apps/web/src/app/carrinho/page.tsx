import type { Metadata } from 'next';
import { CartView } from '@/features/cart/components/CartView/CartView';

export const metadata: Metadata = {
  title: 'Carrinho',
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return <CartView />;
}
