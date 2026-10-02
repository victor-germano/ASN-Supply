import { timingSafeEqual } from 'node:crypto';

/**
 * Headers que só o servidor do site (Next.js) envia — ver `serverFetch.ts`
 * em `apps/web`. Quase todo acesso à API passa pelo servidor do Next, então
 * pelo IP de conexão TODOS os visitantes pareciam uma pessoa só: o limite
 * de 100 req/min (e o de 5 logins/min) virava um limite da loja inteira, e
 * com poucas pessoas navegando a loja começava a responder 429.
 */
export const INTERNAL_KEY_HEADER = 'x-asn-internal-key';
export const CLIENT_IP_HEADER = 'x-asn-client-ip';

export type ThrottleIdentity = { skip: true } | { skip: false; tracker: string };

/**
 * Função pura (testada em `throttle-identity.spec.ts`) que decide quem é
 * "a pessoa" de uma requisição para o rate limit:
 *
 * - chave interna válida + IP do visitante → limita por aquele visitante;
 * - chave interna válida sem IP → é o próprio servidor do site buscando
 *   catálogo para o cache dele (sem visitante por trás) — não limita;
 * - sem chave (ou chave errada) → IP da conexão, como sempre. O header de
 *   IP é ignorado nesse caso: sem a chave, qualquer um poderia forjar um
 *   IP diferente a cada tentativa e escapar do limite de login.
 */
export function resolveThrottleIdentity(params: {
  headers: Record<string, string | string[] | undefined>;
  connectionIp: string | undefined;
  internalKey: string | undefined;
}): ThrottleIdentity {
  const { headers, connectionIp, internalKey } = params;
  const fallback: ThrottleIdentity = { skip: false, tracker: connectionIp ?? 'unknown' };

  if (!internalKey || !isValidKey(firstHeader(headers[INTERNAL_KEY_HEADER]), internalKey)) {
    return fallback;
  }

  const clientIp = firstHeader(headers[CLIENT_IP_HEADER])?.trim();
  return clientIp ? { skip: false, tracker: clientIp } : { skip: true };
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isValidKey(received: string | undefined, expected: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  // `timingSafeEqual` exige tamanhos iguais — e comparar tamanho primeiro
  // não vaza nada útil (o tamanho da chave não é segredo).
  return a.length === b.length && timingSafeEqual(a, b);
}
