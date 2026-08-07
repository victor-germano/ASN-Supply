import type { Metadata } from 'next';
import { Container, Heading, Text } from '@asn/ui';
import { getProductFacets, searchProducts } from '@/services/catalog.service';
import {
  parseProductSearchParams,
  rawParamsToSearchString,
  type RawSearchParams,
} from '@/features/catalog/utils/productSearchParams';
import { ProductListingLayout } from '@/features/catalog/components/ProductListingLayout/ProductListingLayout';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Todos os Produtos',
  description:
    'Explore a curadoria completa da ASN Supply — filtre por marca, categoria, cor, tamanho e preço.',
  // Combinações de filtro não viram páginas indexadas separadas — evita conteúdo duplicado no índice de busca.
  alternates: { canonical: '/produtos' },
};

interface ProdutosPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function ProdutosPage({ searchParams }: ProdutosPageProps) {
  const rawParams = await searchParams;
  const currentSearch = rawParamsToSearchString(rawParams);
  const { filters, pagination } = parseProductSearchParams(rawParams);

  const [result, facets] = await Promise.all([
    searchProducts(filters, pagination),
    getProductFacets(),
  ]);

  return (
    <main className="bg-bone-100">
      <Container className="py-10">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Produtos' }]} />

        <div className="mt-4 flex flex-col gap-2 border-b border-ink/10 pb-8">
          <Heading as="h1" size="lg">
            Todos os Produtos
          </Heading>
          <Text tone="muted">
            {result.totalItems}{' '}
            {result.totalItems === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </Text>
        </div>

        <ProductListingLayout
          result={result}
          facets={facets}
          filters={filters}
          currentSearch={currentSearch}
          emptyStateHref="/produtos"
        />
      </Container>
    </main>
  );
}
