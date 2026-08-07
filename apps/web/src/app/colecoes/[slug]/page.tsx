import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Container, Heading, Text } from '@asn/ui';
import { getCollectionBySlug, getProductFacets, searchProducts } from '@/services/catalog.service';
import {
  parseProductSearchParams,
  rawParamsToSearchString,
  type RawSearchParams,
} from '@/features/catalog/utils/productSearchParams';
import { ProductListingLayout } from '@/features/catalog/components/ProductListingLayout/ProductListingLayout';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return {};

  return {
    title: collection.name,
    description: collection.description,
    alternates: { canonical: `/colecoes/${slug}` },
    openGraph: {
      title: collection.name,
      description: collection.description,
      images: collection.coverImage ? [{ url: collection.coverImage.url }] : undefined,
    },
  };
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const rawParams = await searchParams;
  const currentSearch = rawParamsToSearchString(rawParams);
  const { filters, pagination } = parseProductSearchParams(rawParams);
  filters.collectionSlugs = [slug];

  const [result, facets] = await Promise.all([
    searchProducts(filters, pagination),
    getProductFacets(),
  ]);

  return (
    <main className="bg-bone-100">
      <div className="relative flex h-[45vh] min-h-[360px] items-end">
        {collection.coverImage && (
          <Image
            src={collection.coverImage.url}
            alt={collection.coverImage.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
        <Container className="relative pb-10 text-white">
          <Heading as="h1" size="display">
            {collection.name}
          </Heading>
          <Text className="mt-3 max-w-xl text-white/85">{collection.description}</Text>
        </Container>
      </div>

      <Container className="py-10">
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }, { label: 'Coleções' }, { label: collection.name }]}
        />

        <ProductListingLayout
          result={result}
          facets={facets}
          filters={filters}
          currentSearch={currentSearch}
          emptyStateHref={`/colecoes/${slug}`}
          hideCategoryFilter
        />
      </Container>
    </main>
  );
}
