/**
 * IP do visitante para o rate limit da API (login, cadastro, códigos).
 *
 * Usa o ÚLTIMO valor de `x-forwarded-for`, não o primeiro: o primeiro é o
 * que o próprio visitante mandou (qualquer um escreve
 * `X-Forwarded-For: 1.2.3.4`) — trocar esse valor a cada tentativa
 * zeraria o limite de login. O último é o que a hospedagem/proxy na frente
 * do site acrescentou ao receber a conexão, e esse o visitante não
 * controla. Na Vercel o header chega com um valor só (já é o do cliente).
 *
 * Função pura para rodar tanto no middleware (Edge) quanto no servidor.
 */
export function pickClientIp(
  forwardedFor: string | null | undefined,
  realIp: string | null | undefined,
): string {
  const hops = (forwardedFor ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return hops.at(-1) || realIp?.trim() || 'unknown';
}
