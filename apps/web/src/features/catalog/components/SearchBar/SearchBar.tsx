'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setSingleParam } from '@/features/catalog/utils/productSearchParams';

const DEBOUNCE_MS = 350;

/** Busca instantânea: dispara a navegação (URL-driven) alguns milissegundos depois de parar de digitar, sem precisar de botão de busca. */
export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Mantém o campo sincronizado quando a busca muda por outra via (ex: clique em chip removendo o filtro).
  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  function handleChange(nextValue: string) {
    setValue(nextValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const query = setSingleParam(searchParams, 'q', nextValue.trim());
      router.push(`?${query}`, { scroll: false });
    }, DEBOUNCE_MS);
  }

  return (
    <div className="relative flex-1">
      <label htmlFor="plp-search" className="sr-only">
        Buscar produtos
      </label>
      <input
        id="plp-search"
        type="search"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Buscar tênis, marca ou estilo..."
        className="h-11 w-full border border-ink/15 bg-transparent px-4 text-sm text-ink placeholder:text-ink-muted focus-visible:border-ink focus-visible:outline-none"
      />
    </div>
  );
}
