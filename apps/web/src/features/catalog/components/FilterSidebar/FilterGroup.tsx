import Link from 'next/link';
import { Text } from '@asn/ui';
import { toggleListParam } from '@/features/catalog/utils/productSearchParams';

export interface FilterGroupOption {
  value: string;
  label: string;
  count: number;
  /** Amostra de cor — só usado pelo grupo "Cor" para render um swatch em vez de checkbox. */
  swatchHex?: string;
}

export interface FilterGroupProps {
  title: string;
  paramKey: string;
  options: FilterGroupOption[];
  currentSearch: URLSearchParams;
}

/**
 * Grupo de filtro renderizado como links que alternam o parâmetro na URL —
 * funciona sem nenhum JavaScript no cliente (navegação nativa do Next já
 * evita reload completo). Cada link comunica o estado via `aria-current` e
 * texto adicional visualmente oculto, já que semântica de checkbox nativa
 * exigiria um `<button>` — o que quebraria a navegação progressiva.
 */
export function FilterGroup({ title, paramKey, options, currentSearch }: FilterGroupProps) {
  if (options.length === 0) return null;

  const selected = new Set((currentSearch.get(paramKey) ?? '').split(',').filter(Boolean));

  return (
    <fieldset className="border-t border-ink/10 py-5 first:border-t-0 first:pt-0">
      <legend className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-ink">
        {title}
      </legend>
      <ul className="flex flex-col gap-2.5">
        {options.map((option) => {
          const isSelected = selected.has(option.value);
          const href = `?${toggleListParam(currentSearch, paramKey, option.value)}`;

          return (
            <li key={option.value}>
              <Link
                href={href}
                aria-current={isSelected ? 'true' : undefined}
                scroll={false}
                className="group flex items-center gap-2.5 text-sm text-ink-muted transition-colors hover:text-ink"
              >
                {option.swatchHex ? (
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-ink/15"
                    style={{ backgroundColor: option.swatchHex }}
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                      isSelected ? 'border-ink bg-ink' : 'border-ink/25 group-hover:border-ink/60'
                    }`}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none">
                        <path
                          d="M2 6l2.5 2.5L10 3"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                )}
                <Text as="span" size="sm" className={isSelected ? 'text-ink' : undefined}>
                  {option.label}
                </Text>
                <span className="ml-auto text-xs text-ink-muted">{option.count}</span>
                <span className="sr-only">{isSelected ? ', filtro aplicado' : ''}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
