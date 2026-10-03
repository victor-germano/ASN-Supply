'use client';

import { useEffect } from 'react';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { trackActivityAction } from '@/actions/auth';

/**
 * Sem UI — registra a visita ao montar: localmente ("Vistos recentemente")
 * e, só para cliente LOGADO, também na conta (base do lembrete por SMS,
 * que por sua vez só sai para quem autorizou). Visitante não é rastreado.
 */
export function RegisterProductView({ productId }: { productId: string }) {
  const registerView = useRecentlyViewedStore((state) => state.registerView);
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;

  useEffect(() => {
    registerView(productId);
  }, [productId, registerView]);

  useEffect(() => {
    if (userId) void trackActivityAction(productId, 'PRODUCT_VIEW');
  }, [productId, userId]);

  return null;
}
