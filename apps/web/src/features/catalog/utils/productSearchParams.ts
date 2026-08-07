import type {
  PaginationParams,
  ProductFilters,
  ProductGender,
  ProductSortOption,
} from '@asn/types';

export type RawSearchParams = Record<string, string | string[] | undefined>;

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 48;
const VALID_SORTS: ProductSortOption[] = [
  'RELEVANCE',
  'NEWEST',
  'PRICE_ASC',
  'PRICE_DESC',
  'BEST_SELLING',
  'TOP_RATED',
];
const VALID_GENDERS: ProductGender[] = ['MASCULINO', 'FEMININO', 'UNISSEX', 'INFANTIL'];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toList(value: string | string[] | undefined): string[] | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const items = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/** Preço em reais (URL) → centavos não-negativos, ou `undefined` se ausente/inválido. Nunca deixa passar `NaN` para a API. */
function parsePriceInCents(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const reais = Number(raw);
  if (!Number.isFinite(reais)) return undefined;
  return Math.max(0, Math.round(reais * 100));
}

/**
 * Única fonte de verdade para ler filtros/paginação da URL — usada pela
 * página (server) e implicitamente espelhada pelos componentes de filtro
 * (client) ao construir a URL de destino, para os dois lados nunca
 * divergirem sobre o formato de um parâmetro.
 */
export function parseProductSearchParams(searchParams: RawSearchParams): {
  filters: ProductFilters;
  pagination: PaginationParams;
} {
  const sortRaw = first(searchParams.sort);
  const sort = VALID_SORTS.includes(sortRaw as ProductSortOption)
    ? (sortRaw as ProductSortOption)
    : undefined;

  const genders = toList(searchParams.genders)?.filter((value): value is ProductGender =>
    VALID_GENDERS.includes(value as ProductGender),
  );

  const pageRaw = Number(first(searchParams.page));
  const pageSizeRaw = Number(first(searchParams.pageSize));

  return {
    filters: {
      brandSlugs: toList(searchParams.marcas),
      categorySlugs: toList(searchParams.categoria),
      collectionSlugs: toList(searchParams.colecao),
      colorNames: toList(searchParams.cores),
      sizes: toList(searchParams.tamanhos),
      genders: genders?.length ? genders : undefined,
      minPriceInCents: parsePriceInCents(first(searchParams.minPrice)),
      maxPriceInCents: parsePriceInCents(first(searchParams.maxPrice)),
      query: first(searchParams.q)?.trim() || undefined,
      sort,
    },
    pagination: {
      page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1,
      // Clampado em [1, 48] — o mesmo limite que o DTO da API valida
      // (`@Max(48)`). Sem isto, um `?pageSize=100` editado à mão na URL
      // derruba a página inteira com um 400 não tratado, em vez de só
      // ignorar o valor fora do intervalo.
      pageSize:
        Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
          ? Math.min(MAX_PAGE_SIZE, Math.floor(pageSizeRaw))
          : DEFAULT_PAGE_SIZE,
    },
  };
}

/**
 * Alterna um valor dentro de um parâmetro multi-valor (ex: marca, cor) e
 * devolve a query string resultante — sempre reseta `page` para 1, porque
 * mudar o conjunto de resultados invalida a posição de paginação atual.
 */
export function toggleListParam(current: URLSearchParams, key: string, value: string): string {
  const next = new URLSearchParams(current);
  const existing = new Set((next.get(key) ?? '').split(',').filter(Boolean));

  if (existing.has(value)) {
    existing.delete(value);
  } else {
    existing.add(value);
  }

  if (existing.size > 0) {
    next.set(key, Array.from(existing).join(','));
  } else {
    next.delete(key);
  }
  next.delete('page');

  return next.toString();
}

/** Define (ou remove, se vazio) um parâmetro de valor único e reseta a paginação. */
export function setSingleParam(current: URLSearchParams, key: string, value: string): string {
  const next = new URLSearchParams(current);
  if (value) {
    next.set(key, value);
  } else {
    next.delete(key);
  }
  next.delete('page');
  return next.toString();
}

/** Reconstrói a query string bruta a partir do `searchParams` do Next (Server Component) — usada por Sidebar/Chips/Paginação como fonte comum de estado. */
export function rawParamsToSearchString(params: RawSearchParams): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) usp.append(key, item);
    } else {
      usp.set(key, value);
    }
  }
  return usp.toString();
}

export function removeParam(current: URLSearchParams, key: string): string {
  const next = new URLSearchParams(current);
  next.delete(key);
  next.delete('page');
  return next.toString();
}
