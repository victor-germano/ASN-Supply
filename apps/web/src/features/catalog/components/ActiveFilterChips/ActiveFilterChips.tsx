import Link from 'next/link';
import type { ProductFacets, ProductFilters } from '@asn/types';
import { removeParam, toggleListParam } from '@/features/catalog/utils/productSearchParams';
import { GENDER_LABELS } from '@/features/catalog/constants';
import { CloseIcon } from '@/components/icons';

interface Chip {
  key: string;
  label: string;
  href: string;
}

export interface ActiveFilterChipsProps {
  filters: ProductFilters;
  facets: ProductFacets;
  currentSearch: string;
}

/** Fileira de chips removíveis refletindo cada filtro ativo — nenhum estado além da URL. */
export function ActiveFilterChips({ filters, facets, currentSearch }: ActiveFilterChipsProps) {
  const current = new URLSearchParams(currentSearch);
  const chips: Chip[] = [];

  for (const slug of filters.brandSlugs ?? []) {
    const brand = facets.brands.find((b) => b.slug === slug);
    chips.push({
      key: `marca-${slug}`,
      label: brand?.label ?? slug,
      href: `?${toggleListParam(current, 'marcas', slug)}`,
    });
  }
  for (const slug of filters.categorySlugs ?? []) {
    const category = facets.categories.find((c) => c.slug === slug);
    chips.push({
      key: `categoria-${slug}`,
      label: category?.label ?? slug,
      href: `?${toggleListParam(current, 'categoria', slug)}`,
    });
  }
  for (const name of filters.colorNames ?? []) {
    chips.push({
      key: `cor-${name}`,
      label: name,
      href: `?${toggleListParam(current, 'cores', name)}`,
    });
  }
  for (const size of filters.sizes ?? []) {
    chips.push({
      key: `tamanho-${size}`,
      label: `Tam. ${size}`,
      href: `?${toggleListParam(current, 'tamanhos', size)}`,
    });
  }
  for (const gender of filters.genders ?? []) {
    chips.push({
      key: `genero-${gender}`,
      label: GENDER_LABELS[gender] ?? gender,
      href: `?${toggleListParam(current, 'genders', gender)}`,
    });
  }
  if (filters.minPriceInCents !== undefined || filters.maxPriceInCents !== undefined) {
    const min =
      filters.minPriceInCents !== undefined
        ? filters.minPriceInCents / 100
        : facets.priceRange.minInCents / 100;
    const max =
      filters.maxPriceInCents !== undefined
        ? filters.maxPriceInCents / 100
        : facets.priceRange.maxInCents / 100;
    const priceParams = new URLSearchParams(current);
    priceParams.delete('minPrice');
    priceParams.delete('maxPrice');
    priceParams.delete('page');
    chips.push({
      key: 'price',
      label: `R$ ${min.toFixed(0)} – R$ ${max.toFixed(0)}`,
      href: `?${priceParams.toString()}`,
    });
  }
  if (filters.query) {
    chips.push({
      key: 'query',
      label: `"${filters.query}"`,
      href: `?${removeParam(current, 'q')}`,
    });
  }

  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Filtros ativos">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={chip.href}
            scroll={false}
            className="flex items-center gap-1.5 rounded-full border border-ink/15 py-1.5 pl-3 pr-2 text-xs text-ink transition-colors hover:border-ink"
          >
            {chip.label}
            <CloseIcon className="h-3 w-3" />
            <span className="sr-only">Remover filtro</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
