'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Text } from '@asn/ui';
import type { AiSearchResult } from '@asn/types';
import { aiSearchProducts } from '@/services/catalog.service';
import { ProductCard } from '@/features/catalog/components/ProductCard/ProductCard';
import { SparklesIcon } from '@/components/icons';

/**
 * "Busca por estilo" — complementa a `SearchBar` instantânea (que já
 * existe, busca por texto literal) com uma entrada em linguagem natural
 * ("tênis pra corrida no frio", "visual streetwear leve"). Ao contrário
 * da busca instantânea, dispara só no submit (não por tecla) — envolve
 * uma chamada de IA do lado do servidor, não uma query indexada barata.
 * Resultado próprio, abaixo do campo — não filtra a grade normal da PLP,
 * pra não complicar a URL-driven filter architecture que já existe ali.
 */
export function AiStyleSearch() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const mutation = useMutation<AiSearchResult, Error, string>({
    mutationFn: aiSearchProducts,
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setSubmittedQuery(query.trim());
    mutation.mutate(query.trim());
  }

  return (
    <div className="mb-8 border border-ink/10 bg-bone-50 p-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 border border-ink/15 bg-transparent px-4">
          <SparklesIcon className="h-4 w-4 shrink-0 text-olive-600" />
          <label htmlFor="ai-style-search" className="sr-only">
            Descreva o que você procura
          </label>
          <input
            id="ai-style-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Descreva o que procura — ex: "tênis leve pra corrida no frio"'
            className="h-11 w-full border-0 bg-transparent text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none"
          />
        </div>
        <Button type="submit" size="md" isLoading={mutation.isPending} disabled={!query.trim()}>
          Buscar por estilo
        </Button>
      </form>

      {mutation.data && (
        <div className="mt-6">
          {mutation.data.summary && (
            <Text size="sm" className="mb-4 border-l-2 border-olive-500 pl-3 text-ink">
              {mutation.data.summary}
            </Text>
          )}
          {!mutation.data.isAiPowered && (
            <Text size="xs" tone="muted" className="mb-4">
              Busca por palavra-chave (assistente de estilo indisponível no momento).
            </Text>
          )}
          {mutation.data.products.length === 0 ? (
            <Text tone="muted">Nenhum produto combinou com &ldquo;{submittedQuery}&rdquo;.</Text>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {mutation.data.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      )}

      {mutation.isError && (
        <Text size="sm" className="mt-4 text-error" role="alert">
          Não foi possível buscar agora. Tente novamente em instantes.
        </Text>
      )}
    </div>
  );
}
