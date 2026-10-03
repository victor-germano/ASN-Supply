/**
 * Aceita só caminho interno do próprio site para redirecionar depois do
 * login (`?next=`). Sem isso, um link como `/login?next=//golpe.com` levaria
 * o cliente, já logado, para um site falso (open redirect).
 *
 * Barra invertida também é recusada: o navegador trata `\` como `/`, então
 * `/\golpe.com` vira `//golpe.com`. Caracteres de controle (tab, quebra de
 * linha) são descartados pelo navegador no meio da URL e permitem o mesmo
 * truque (`/\t/golpe.com`).
 */
export function isSafeInternalPath(value: string | null | undefined): value is string {
  return (
    !!value &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}
