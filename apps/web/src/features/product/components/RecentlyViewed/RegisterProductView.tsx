'use client';

import { useEffect } from 'react';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';

/** Sem UI — só registra a visita ao montar, alimentando "Vistos recentemente" em futuras páginas. */
export function RegisterProductView({ productId }: { productId: string }) {
  const registerView = useRecentlyViewedStore((state) => state.registerView);

  useEffect(() => {
    registerView(productId);
  }, [productId, registerView]);

  return null;
}
