/**
 * Tipos genéricos reutilizados por todos os contratos de domínio.
 */

/** Valor monetário representado em centavos para evitar erros de ponto flutuante. */
export interface Money {
  /** Valor em centavos (ex: R$ 599,90 -> 59990). */
  amountInCents: number;
  currency: 'BRL';
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiErrorBody {
  statusCode: number;
  /** Código estável para tratamento programático no client (ex: PRODUCT_NOT_FOUND). */
  errorCode: string;
  message: string;
  details?: Record<string, string[]>;
  timestamp: string;
  path: string;
}

export interface ImageAsset {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  /** Posição de exibição na galeria/carrossel. */
  position: number;
}
