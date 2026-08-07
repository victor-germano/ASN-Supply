import { Text } from '@asn/ui';

export interface PriceRangeFilterProps {
  priceRange: { minInCents: number; maxInCents: number };
  currentSearch: URLSearchParams;
}

/**
 * Formulário GET nativo: preserva todo filtro já aplicado via inputs
 * ocultos e some com `minPrice`/`maxPrice` da URL quando o campo fica
 * vazio. Funciona sem nenhum JavaScript no cliente.
 */
export function PriceRangeFilter({ priceRange, currentSearch }: PriceRangeFilterProps) {
  const currentMin = currentSearch.get('minPrice') ?? '';
  const currentMax = currentSearch.get('maxPrice') ?? '';
  const preserved = new URLSearchParams(currentSearch);
  preserved.delete('minPrice');
  preserved.delete('maxPrice');
  preserved.delete('page');

  return (
    <fieldset className="border-t border-ink/10 py-5">
      <legend className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-ink">
        Preço
      </legend>
      <form method="get" className="flex items-end gap-3">
        {Array.from(preserved.entries()).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <label className="flex flex-1 flex-col gap-1">
          <Text as="span" size="xs" tone="muted">
            De (R$)
          </Text>
          <input
            type="number"
            name="minPrice"
            min={0}
            step={1}
            defaultValue={currentMin}
            placeholder={String(Math.floor(priceRange.minInCents / 100))}
            className="h-9 w-full border border-ink/15 px-2 text-sm focus-visible:border-ink focus-visible:outline-none"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <Text as="span" size="xs" tone="muted">
            Até (R$)
          </Text>
          <input
            type="number"
            name="maxPrice"
            min={0}
            step={1}
            defaultValue={currentMax}
            placeholder={String(Math.ceil(priceRange.maxInCents / 100))}
            className="h-9 w-full border border-ink/15 px-2 text-sm focus-visible:border-ink focus-visible:outline-none"
          />
        </label>
        <button
          type="submit"
          className="h-9 shrink-0 border border-ink px-3 text-xs uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-white"
        >
          Aplicar
        </button>
      </form>
    </fieldset>
  );
}
