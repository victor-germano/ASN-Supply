export const DEFAULT_AFTER_LOGIN_PATH = '/conta/pedidos';

/**
 * Só caminho interno do site vira destino pós-login (mesma regra de
 * `apps/web/src/lib/safeRedirect.ts`). Recusa `//host` (protocol-relative),
 * barra invertida (`/\host` — o navegador trata `\` como `/`) e caracteres
 * de controle (o navegador os descarta no meio da URL: `/\t/host`).
 */
export function isSafeInternalPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

export function safeAfterLoginPath(value: unknown): string {
  return isSafeInternalPath(value) ? value : DEFAULT_AFTER_LOGIN_PATH;
}
