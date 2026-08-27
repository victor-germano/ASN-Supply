import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/authCookies';
import { apiFetch, ApiError, type ApiFetchOptions } from './apiClient';

const HTTP_STATUS_UNAUTHORIZED = 401;

function withAuthHeader(
  options: ApiFetchOptions,
  accessToken: string | undefined,
): ApiFetchOptions {
  // `new Headers(...)` (em vez de espalhar `options.init?.headers` num
  // objeto plano) lida corretamente tanto com um objeto simples quanto
  // com uma instância real de `Headers` — espalhar uma `Headers` não
  // produz pares chave/valor, silenciosamente perderia esses headers.
  const headers = new Headers(options.init?.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return { ...options, init: { ...options.init, headers } };
}

/**
 * Variante de `apiFetch` que lê o cookie httpOnly de sessão (`asn_at`) e
 * encaminha como `Authorization: Bearer` — para as chamadas que realmente
 * precisam saber quem está logado (histórico de pedidos, endereços, admin,
 * `/auth/me`, checkout autenticado). Isolado num arquivo próprio (não
 * dentro de `apiClient.ts`, que é importado por client components como
 * `RecentlyViewed`) porque só IMPORTAR `next/headers` já faz o Next
 * recusar empacotar o módulo para o cliente, mesmo que a chamada real
 * nunca aconteça lá — só código genuinamente server-only (Server
 * Components, Server Actions) deve importar este arquivo.
 *
 * Refresh reativo: `middleware.ts` renova proativamente o token só sob
 * `/conta/**`/`/admin/**` — checkout e a confirmação de pedido
 * (`/pedido/[id]`) ficam fora desse matcher de propósito (não são áreas
 * exclusivas de conta). Sem isso aqui, um token expirado no meio de uma
 * sessão longa faria `POST /orders` criar o pedido como se fosse de
 * convidado (silenciosamente, sem erro nenhum) e `/pedido/[id]` mostrar
 * "não encontrado" para o próprio dono — os dois achados mais sérios do
 * code-review desta fase. Em falha 401, tenta renovar uma vez com o
 * refresh token e repete a chamada original antes de desistir. Não
 * persiste o token novo em cookie aqui (Server Component não escreve
 * cookie) — inofensivo, já que o refresh token não é de uso único (sem
 * revogação no v1, ver `AuthService`); a próxima chamada só renova de novo.
 */
export async function authenticatedFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  try {
    return await apiFetch<T>(path, withAuthHeader(options, accessToken));
  } catch (error) {
    if (!(error instanceof ApiError) || error.statusCode !== HTTP_STATUS_UNAUTHORIZED) {
      throw error;
    }

    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    if (!refreshToken) {
      throw error;
    }

    try {
      const refreshed = await apiFetch<{ accessToken: string }>('/auth/refresh', {
        init: { method: 'POST', body: JSON.stringify({ refreshToken }) },
      });
      return await apiFetch<T>(path, withAuthHeader(options, refreshed.accessToken));
    } catch {
      // Refresh também falhou (refresh token igualmente expirado/inválido)
      // — não há mais o que tentar; propaga o 401 original.
      throw error;
    }
  }
}
