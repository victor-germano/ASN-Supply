'use client';

import { useRouter } from 'next/navigation';
import { logoutAction } from '@/actions/auth';
import { useInvalidateCurrentUser } from '@/hooks/useCurrentUser';
import { useCartStore } from '@/stores/cartStore';

/**
 * Substitui `<form action={logoutAction}>` puro nos layouts de `/conta` e
 * `/admin` (ambos Server Components, sem acesso a hooks) — precisa ser
 * Client Component pra invalidar a query de `useCurrentUser` (React Query),
 * senão favoritos/carrinho continuariam achando que a sessão existe por
 * até `staleTime` depois do logout.
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const invalidateCurrentUser = useInvalidateCurrentUser();

  async function handleLogout() {
    await logoutAction();
    // O carrinho local era espelho do da conta (ver `CartSync`) — continua
    // salvo no servidor; aqui ele some do aparelho (computador
    // compartilhado) e o próximo login faz o merge do zero, sem duplicar.
    useCartStore.getState().clear();
    useCartStore.getState().setSyncedUserId(null);
    invalidateCurrentUser();
    router.push('/');
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      Sair
    </button>
  );
}
