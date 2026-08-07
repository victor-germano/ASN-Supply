'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container, Heading, Section } from '@asn/ui';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';
import { getProductsByIds } from '@/services/product.service';
import { ProductCard } from '@/features/catalog/components/ProductCard/ProductCard';

/**
 * Client component de propósito: "vistos recentemente" depende do
 * histórico local (localStorage) do navegador, que o servidor não tem
 * como saber ao renderizar a página — é exatamente o tipo de busca que
 * faz sentido no cliente, com React Query cuidando de cache/loading.
 */
export function RecentlyViewed({ excludeProductId }: { excludeProductId: string }) {
  const hasHydrated = useRecentlyViewedStore((state) => state.hasHydrated);
  // A filtragem NÃO pode acontecer dentro do seletor do Zustand: `.filter()`
  // devolve um array novo a cada chamada, o que o Zustand sempre lê como
  // "mudou" — cada render dispara outro render, num loop infinito (React
  // error #185). Só a referência crua do estado vai no seletor; o filtro
  // fica num useMemo, estável entre renders enquanto a lista não mudar de
  // verdade.
  const allProductIds = useRecentlyViewedStore((state) => state.productIds);
  const productIds = useMemo(
    () => allProductIds.filter((id) => id !== excludeProductId),
    [allProductIds, excludeProductId],
  );

  const { data: products } = useQuery({
    queryKey: ['recently-viewed', productIds],
    queryFn: () => getProductsByIds(productIds),
    enabled: hasHydrated && productIds.length > 0,
  });

  if (!hasHydrated || !products || products.length === 0) return null;

  return (
    <Section spacing="compact" className="border-t border-ink/10">
      <Container>
        <Heading as="h2" size="md" className="mb-8">
          Vistos recentemente
        </Heading>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4 lg:grid-cols-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
