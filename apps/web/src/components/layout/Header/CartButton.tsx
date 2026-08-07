'use client';

import Link from 'next/link';
import { useCartStore } from '@/stores/cartStore';
import { BagIcon } from '@/components/icons';

/** Ícone de carrinho com badge de quantidade — client component por depender da store global. */
export function CartButton() {
  const itemCount = useCartStore((state) => state.itemCount);

  return (
    <Link
      href="/carrinho"
      aria-label={itemCount > 0 ? `Carrinho, ${itemCount} itens` : 'Carrinho'}
      className="relative flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-olive-600"
    >
      <BagIcon className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-olive-600 px-1 text-[10px] font-medium text-white">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
