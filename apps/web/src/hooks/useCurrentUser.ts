'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUserAction } from '@/actions/auth';

export const CURRENT_USER_QUERY_KEY = ['currentUser'] as const;

/**
 * `user: undefined` = ainda carregando; `null` = visitante/convidado;
 * objeto = logado. Usado pelos hooks de sincronização (favoritos, carrinho)
 * pra decidir se leem/escrevem no backend ou ficam só em localStorage.
 *
 * Depois de login/registro/logout, chame
 * `queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })`
 * (ver `LoginForm`/`RegisterForm`/`conta/layout.tsx`) — sem isso, um login
 * feito numa aba só atualizaria esta query na próxima remontagem natural.
 */
export function useCurrentUser() {
  const { data, isLoading } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUserAction,
    staleTime: 60 * 1000,
  });
  return { user: isLoading ? undefined : (data ?? null), isLoading };
}

export function useInvalidateCurrentUser() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
}
