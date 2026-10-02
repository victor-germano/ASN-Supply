import type { ApiErrorBody } from '@asn/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3400/v1';
const HTTP_STATUS_NO_CONTENT = 204;
/** Mesmo nome que a API lê em `common/guards/throttle-identity.ts`. */
export const INTERNAL_KEY_HEADER = 'x-asn-internal-key';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiFetchOptions {
  /** Query params serializados automaticamente (arrays viram múltiplas entradas). */
  searchParams?: Record<string, string | number | boolean | undefined>;
  /** Segundos de cache (ISR). Omitir para usar o padrão do Next (cache estático). */
  revalidateSeconds?: number;
  init?: RequestInit;
}

/**
 * Cliente HTTP tipado para a API NestJS. Usado a partir de Server
 * Components (fetch direto, com cache do Next), de Server Actions
 * (mutações) e — desde o RecentlyViewed (Módulo 3) — também de client
 * components lendo dados client-only. Nunca é chamado com a URL base
 * hardcoded fora deste módulo.
 *
 * Deliberadamente sem nenhuma lógica de cookie/sessão aqui: qualquer coisa
 * que use `next/headers` (mesmo que só chamada condicionalmente) faz o
 * Next recusar empacotar o módulo inteiro para o cliente — e este arquivo
 * é importado por client components. Chamadas autenticadas usam
 * `authenticatedFetch` (`authenticatedFetch.ts`), que fica isolado num
 * arquivo só server-only.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const url = new URL(`${API_URL}${path}`);

  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  // `new Headers(...)` em vez de espalhar `options.init?.headers` num
  // objeto literal: espalhar uma instância de `Headers` (é o que
  // `authenticatedFetch.ts` passa) não copia nada — `Headers` expõe seus
  // pares via iterador/`.entries()`, não como propriedades próprias
  // enumeráveis — o que perderia silenciosamente o `Authorization` que
  // acabou de ser setado ali.
  const headers = new Headers(options.init?.headers);
  // `FormData` (usado por `uploadAdminImage`) nunca ganha `Content-Type`
  // manual — o multipart boundary certo só existe depois que o `fetch`
  // serializa o body de verdade; setar `application/json` aqui quebraria
  // esse upload (a API leria um body multipart com Content-Type mentindo
  // que é JSON).
  const isFormData = options.init?.body instanceof FormData;
  if (!headers.has('Content-Type') && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  // Só no servidor: identifica o servidor do site pra API (ver
  // `throttle-identity.ts` lá). No navegador `INTERNAL_API_KEY` nem existe
  // — variável sem `NEXT_PUBLIC_` nunca entra no bundle do cliente. Valor
  // fixo, então não fragmenta o cache de catálogo.
  const internalKey = typeof window === 'undefined' ? process.env.INTERNAL_API_KEY : undefined;
  if (internalKey) {
    headers.set(INTERNAL_KEY_HEADER, internalKey);
  }

  const response = await fetch(url, {
    ...options.init,
    headers,
    next:
      options.revalidateSeconds !== undefined
        ? { revalidate: options.revalidateSeconds }
        : undefined,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      body?.message ?? `Falha ao chamar ${path} (HTTP ${response.status})`,
      response.status,
      body?.errorCode ?? 'UNKNOWN_ERROR',
    );
  }

  // 204 No Content (ex: DELETE /addresses/:id) não tem corpo — chamar
  // .json() nesse caso lançaria "Unexpected end of JSON input" à toa.
  if (response.status === HTTP_STATUS_NO_CONTENT) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
