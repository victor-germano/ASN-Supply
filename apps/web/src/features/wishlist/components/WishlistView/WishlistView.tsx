'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container, Heading, Text, buttonStyles } from '@asn/ui';
import Link from 'next/link';
import { useWishlistStore } from '@/stores/wishlistStore';
import { getProductsByIds } from '@/services/product.service';
import { ProductCard } from '@/features/catalog/components/ProductCard/ProductCard';
import { CloseIcon } from '@/components/icons';

/**
 * Favoritos existia como estado (toggle na PDP, persistido em
 * localStorage) mas sem nenhuma página para revisá-los — dava pra
 * favoritar e nunca mais ver a lista. Mesmo padrão de leitura client-only
 * do RecentlyViewed: os IDs só existem no navegador, o servidor não tem
 * como saber ao renderizar.
 */
export function WishlistView() {
  const hasHydrated = useWishlistStore((state) => state.hasHydrated);
  const productIds = useWishlistStore((state) => state.productIds);
  const toggle = useWishlistStore((state) => state.toggle);

  const {
    data: fetchedProducts,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['wishlist', productIds],
    queryFn: () => getProductsByIds(productIds),
    enabled: hasHydrated && productIds.length > 0,
  });

  // Remover um favorito muda `productIds` (e portanto a queryKey), o que
  // dispararia uma nova busca — mas os produtos restantes já estão em
  // memória desde o fetch anterior. Filtrar localmente evita o
  // "Carregando..." piscando a cada remoção; a revalidação em segundo
  // plano do React Query continua acontecendo normalmente por trás.
  const products = useMemo(
    () => fetchedProducts?.filter((product) => productIds.includes(product.id)),
    [fetchedProducts, productIds],
  );

  // Nada é renderizado antes de hidratar — mesmo motivo do CheckoutView:
  // o servidor sempre vê `productIds: []`, então mostrar o estado vazio
  // antes da hora mandaria embora quem tem favoritos de verdade.
  if (!hasHydrated) return null;

  if (productIds.length === 0) {
    return (
      <main className="flex min-h-[70dvh] flex-col items-center justify-center bg-bone-100">
        <Container className="flex flex-col items-center gap-6 py-section text-center">
          <Heading as="h1" size="lg">
            Você ainda não tem favoritos
          </Heading>
          <Text tone="muted" className="max-w-md">
            Toque no coração em qualquer produto para guardá-lo aqui e comparar depois.
          </Text>
          <Link href="/produtos" className={buttonStyles({ size: 'md' })}>
            Explorar produtos
          </Link>
        </Container>
      </main>
    );
  }

  return (
    <main className="bg-bone-100">
      <Container className="py-section">
        <Heading as="h1" size="lg" className="mb-10">
          Favoritos
        </Heading>

        {isError ? (
          <div className="flex flex-col items-start gap-4">
            <Text tone="muted">
              Não conseguimos carregar seus favoritos agora. Tente novamente em instantes.
            </Text>
            <button
              type="button"
              onClick={() => refetch()}
              className={buttonStyles({ size: 'sm' })}
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        ) : isLoading && !products ? (
          <Text tone="muted">Carregando seus favoritos...</Text>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {products?.map((product) => (
              <div key={product.id} className="relative">
                <ProductCard product={product} />
                <button
                  type="button"
                  onClick={() => toggle(product.id)}
                  aria-label={`Remover ${product.name} dos favoritos`}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-bone-50/90 text-ink transition-colors hover:text-error"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
