import type { Metadata } from 'next';
import { WishlistView } from '@/features/wishlist/components/WishlistView/WishlistView';

export const metadata: Metadata = {
  title: 'Favoritos',
  robots: { index: false, follow: false },
};

export default function FavoritosPage() {
  return <WishlistView />;
}
