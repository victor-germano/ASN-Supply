import Link from 'next/link';
import { ChevronRightIcon } from '@/components/icons';

export interface PaginationProps {
  page: number;
  totalPages: number;
  currentSearch: string;
}

function hrefForPage(currentSearch: string, page: number): string {
  const params = new URLSearchParams(currentSearch);
  if (page <= 1) {
    params.delete('page');
  } else {
    params.set('page', String(page));
  }
  const query = params.toString();
  return query ? `?${query}` : '?';
}

/** Janela de páginas visíveis ao redor da atual, com reticências quando há muitas páginas. */
function buildPageWindow(page: number, totalPages: number): (number | 'ellipsis')[] {
  const window = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = Array.from(window)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]!;
    if (i > 0 && current - sorted[i - 1]! > 1) result.push('ellipsis');
    result.push(current);
  }
  return result;
}

export function Pagination({ page, totalPages, currentSearch }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageItems = buildPageWindow(page, totalPages);

  return (
    <nav aria-label="Paginação de produtos" className="flex items-center justify-center gap-1 pt-4">
      <Link
        href={hrefForPage(currentSearch, page - 1)}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={`flex h-10 w-10 items-center justify-center ${
          page <= 1 ? 'pointer-events-none text-ink/20' : 'text-ink hover:text-olive-600'
        }`}
        aria-label="Página anterior"
      >
        <ChevronRightIcon className="h-4 w-4 rotate-180" />
      </Link>

      {pageItems.map((item, index) =>
        item === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 text-sm text-ink-muted"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefForPage(currentSearch, item)}
            aria-current={item === page ? 'page' : undefined}
            className={`flex h-10 w-10 items-center justify-center text-sm ${
              item === page ? 'bg-ink text-white' : 'text-ink hover:bg-bone-200'
            }`}
          >
            {item}
          </Link>
        ),
      )}

      <Link
        href={hrefForPage(currentSearch, page + 1)}
        aria-disabled={page >= totalPages}
        tabIndex={page >= totalPages ? -1 : undefined}
        className={`flex h-10 w-10 items-center justify-center ${
          page >= totalPages ? 'pointer-events-none text-ink/20' : 'text-ink hover:text-olive-600'
        }`}
        aria-label="Próxima página"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </nav>
  );
}
