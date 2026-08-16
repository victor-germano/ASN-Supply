'use client';

import Link from 'next/link';
import { useWishlistStore } from '@/stores/wishlistStore';
import { HeartIcon } from '@/components/icons';

/** Espelha `CartButton` — mesmo padrão de ícone + badge de quantidade. */
export function WishlistButton() {
  const count = useWishlistStore((state) => state.productIds.length);

  return (
    <Link
      href="/favoritos"
      aria-label={count > 0 ? `Favoritos, ${count} itens` : 'Favoritos'}
      className="relative flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-olive-600"
    >
      <HeartIcon className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-olive-600 px-1 text-[10px] font-medium text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
