'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { ProductSummary } from '@asn/types';
import { Text } from '@asn/ui';
import { searchProducts } from '@/services/catalog.service';
import { formatMoney } from '@/lib/formatMoney';

const DEBOUNCE_MS = 350;
const PAGE_SIZE = 8;

interface ProductPickerProps {
  selectedProduct: ProductSummary | null;
  onSelect: (product: ProductSummary | null) => void;
}

/**
 * Busca client-side direta via `catalog.service.ts` (não uma Server
 * Action) — mesmo padrão já usado por `RecentlyViewed`: é leitura pura,
 * sem mutação nem dado sensível, então não há motivo para o hop extra por
 * uma Server Action só para chamar `apiFetch` de novo.
 */
export function ProductPicker({ selectedProduct, onSelect }: ProductPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const timer = setTimeout(() => {
      searchProducts({ query: query.trim() || undefined }, { page: 1, pageSize: PAGE_SIZE })
        .then((result) => {
          if (!cancelled) setResults(result.items);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (selectedProduct) {
    return (
      <div className="flex aspect-[4/5] w-full flex-col justify-between border border-ink/10 p-4">
        <div className="relative aspect-[4/5] w-full bg-bone-200">
          <Image
            src={selectedProduct.primaryImage.url}
            alt={selectedProduct.primaryImage.alt}
            fill
            sizes="300px"
            className="object-cover"
          />
        </div>
        <div className="mt-3">
          <Text size="xs" tone="muted" className="uppercase tracking-wider">
            {selectedProduct.brand.name}
          </Text>
          <Text weight="medium" className="line-clamp-1">
            {selectedProduct.name}
          </Text>
          <div className="mt-1 flex items-center justify-between">
            <Text size="sm" tone="muted">
              {formatMoney(selectedProduct.price)}
            </Text>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-xs uppercase tracking-wider text-ink underline underline-offset-4"
            >
              Trocar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nome, marca..."
        aria-label="Buscar produto"
        className="h-12 w-full border border-ink/15 bg-transparent px-4 text-sm text-ink placeholder:text-ink-muted focus-visible:border-ink focus-visible:outline-none"
      />

      <div className="mt-4 grid max-h-[26rem] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
        {results.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => onSelect(product)}
            className="text-left"
          >
            <div className="relative aspect-[4/5] bg-bone-200">
              <Image
                src={product.primaryImage.url}
                alt={product.primaryImage.alt}
                fill
                sizes="150px"
                className="object-cover"
              />
            </div>
            <Text size="xs" weight="medium" className="mt-2 line-clamp-1">
              {product.name}
            </Text>
            <Text size="xs" tone="muted">
              {formatMoney(product.price)}
            </Text>
          </button>
        ))}
      </div>

      {!isLoading && results.length === 0 && (
        <Text size="sm" tone="muted" className="mt-4 text-center">
          Nenhum produto encontrado.
        </Text>
      )}
    </div>
  );
}
