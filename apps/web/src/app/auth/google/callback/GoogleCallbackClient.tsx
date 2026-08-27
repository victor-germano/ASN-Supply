'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Text } from '@asn/ui';
import { completeGoogleLoginAction } from '@/actions/auth';
import { useInvalidateCurrentUser } from '@/hooks/useCurrentUser';

const isSafeInternalPath = (value: string | null): value is string =>
  !!value && value.startsWith('/') && !value.startsWith('//');

/**
 * `AuthController.googleCallback` (API) redireciona pra cá com
 * `accessToken`/`refreshToken`/`next` no `#fragment` da URL — nunca em
 * `?query`, porque fragmentos nunca saem do navegador (não aparecem em log
 * de acesso nem no header `Referer`). Por isso isto precisa ser um Client
 * Component: `window.location.hash` só existe no navegador, nenhum Server
 * Component/Route Handler chega a ver esse pedaço da URL.
 */
export function GoogleCallbackClient() {
  const router = useRouter();
  const invalidateCurrentUser = useInvalidateCurrentUser();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const next = params.get('next');

    if (!accessToken || !refreshToken) {
      setError('Não foi possível concluir o login com Google. Tente novamente.');
      return;
    }

    completeGoogleLoginAction(accessToken, refreshToken).then(() => {
      invalidateCurrentUser();
      router.replace(isSafeInternalPath(next) ? next : '/conta/pedidos');
      router.refresh();
    });
  }, [invalidateCurrentUser, router]);

  if (error) {
    return (
      <Text size="sm" className="text-error" role="alert">
        {error}{' '}
        <Link href="/entrar" className="underline underline-offset-4">
          Voltar ao login
        </Link>
      </Text>
    );
  }

  return <Text tone="muted">Confirmando seu login com Google...</Text>;
}
