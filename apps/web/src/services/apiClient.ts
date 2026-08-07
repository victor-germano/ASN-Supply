import type { ApiErrorBody } from '@asn/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/v1';

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
 * Components (fetch direto, com cache do Next) e de Server Actions
 * (mutações). Nunca é chamado com a URL base hardcoded fora deste módulo.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const url = new URL(`${API_URL}${path}`);

  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    ...options.init,
    headers: { 'Content-Type': 'application/json', ...options.init?.headers },
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

  return response.json() as Promise<T>;
}
