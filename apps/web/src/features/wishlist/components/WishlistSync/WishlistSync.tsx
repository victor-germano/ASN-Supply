'use client';

import { useEffect, useRef } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useWishlistStore } from '@/stores/wishlistStore';
import {
  addToWishlistAction,
  getWishlistAction,
  removeFromWishlistAction,
} from '@/actions/wishlist';

/**
 * Não renderiza nada — só efeito colateral, montado uma vez no layout raiz
 * (mesmo espírito de `StoreHydration`). Ponte entre `wishlistStore`
 * (localStorage, sempre a fonte de verdade pra UI — funciona offline e pra
 * convidado) e o backend (`WishlistItem`, só existe pra quem está logado).
 *
 * Estratégia: convidado nunca toca a API (nem tenta). Ao logar, faz um
 * merge único (união local ∪ backend, e empurra pro backend o que só
 * existia local). Dali em diante, cada `toggle()` subsequente é espelhado
 * pro backend via `subscribe` — nenhum componente que já chama
 * `useWishlistStore().toggle()` (`WishlistButton`, `ProductActions`,
 * `WishlistView`) precisou mudar uma linha.
 */
export function WishlistSync() {
  const { user } = useCurrentUser();
  const hasHydrated = useWishlistStore((state) => state.hasHydrated);
  const hasMergedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !hasHydrated || hasMergedForUserId.current === user.id) return;

    let cancelled = false;
    (async () => {
      const backendIds = await getWishlistAction();
      if (cancelled || backendIds === null) return;
      hasMergedForUserId.current = user.id;

      const localIds = useWishlistStore.getState().productIds;
      const merged = Array.from(new Set([...backendIds, ...localIds]));
      useWishlistStore.setState({ productIds: merged });

      const localOnly = localIds.filter((id) => !backendIds.includes(id));
      await Promise.all(localOnly.map((id) => addToWishlistAction(id)));
    })();

    return () => {
      cancelled = true;
    };
  }, [user, hasHydrated]);

  useEffect(() => {
    let previousIds = useWishlistStore.getState().productIds;
    return useWishlistStore.subscribe((state) => {
      const currentIds = state.productIds;
      const added = currentIds.filter((id) => !previousIds.includes(id));
      const removed = previousIds.filter((id) => !currentIds.includes(id));
      previousIds = currentIds;

      // Sem usuário: convidado navegando, ou usuário acabou de deslogar —
      // não espelha nada pro backend (a próxima sessão dele parte do zero,
      // ou o merge acima cobre um login futuro).
      if (!user) return;
      added.forEach((id) => addToWishlistAction(id));
      removed.forEach((id) => removeFromWishlistAction(id));
    });
  }, [user]);

  return null;
}
