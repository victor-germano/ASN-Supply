import { headers } from 'next/headers';
import { apiFetch, type ApiFetchOptions } from './apiClient';

/** Mesmo nome que a API lê em `common/guards/throttle-identity.ts`. */
export const CLIENT_IP_HEADER = 'x-asn-client-ip';

/**
 * IP do visitante que fez a requisição ao site — primeiro valor de
 * `x-forwarded-for` (posto pela hospedagem/proxy, ou pelo próprio Next
 * quando não há proxy na frente). `'unknown'` em vez de omitir: sem IP, a
 * API trataria a chamada como "cache do servidor" e não aplicaria limite
 * nenhum — num login, isso abriria força bruta.
 */
export async function getClientIp(): Promise<string> {
  const incoming = await headers();
  const forwardedFor = incoming.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || incoming.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * `apiFetch` para chamadas feitas EM NOME de um visitante (Server Actions
 * e Server Components que não usam cache): repassa o IP dele pra API
 * limitar por pessoa, não pela loja inteira (`apiFetch` já envia a chave
 * interna que faz a API confiar neste header). Nunca cacheado — o
 * resultado é de uma pessoa, e o IP no header fragmentaria o cache.
 *
 * Só pode ser importado por código de servidor (`next/headers`) — por isso
 * não mora dentro de `apiClient.ts`, que também roda no navegador.
 */
export async function serverFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const requestHeaders = new Headers(options.init?.headers);
  requestHeaders.set(CLIENT_IP_HEADER, await getClientIp());
  return apiFetch<T>(path, {
    ...options,
    revalidateSeconds: undefined,
    init: { cache: 'no-store', ...options.init, headers: requestHeaders },
  });
}
