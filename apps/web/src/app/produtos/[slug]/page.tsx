import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@asn/ui';
import { getProductBySlug, getRelatedProducts } from '@/services/product.service';
import {
  rawParamsToSearchString,
  type RawSearchParams,
} from '@/features/catalog/utils/productSearchParams';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { Gallery } from '@/features/product/components/Gallery/Gallery';
import { ProductInfo } from '@/features/product/components/ProductInfo/ProductInfo';
import { ReviewsSection } from '@/features/product/components/ReviewsSection/ReviewsSection';
import { QuestionsSection } from '@/features/product/components/QuestionsSection/QuestionsSection';
import { RelatedProducts } from '@/features/product/components/RelatedProducts/RelatedProducts';
import { RecentlyViewed } from '@/features/product/components/RecentlyViewed/RecentlyViewed';
import { RegisterProductView } from '@/features/product/components/RecentlyViewed/RegisterProductView';
import { formatMoney } from '@/lib/formatMoney';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const description = product.description.slice(0, 155);

  return {
    title: `${product.name} — ${product.brand.name}`,
    description,
    alternates: { canonical: `/produtos/${slug}` },
    openGraph: {
      title: product.name,
      description,
      images: [{ url: product.primaryImage.url }],
    },
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [rawParams, related] = await Promise.all([searchParams, getRelatedProducts(slug, 4)]);
  const currentSearch = rawParamsToSearchString(rawParams);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: [product.primaryImage.url, ...product.images.map((image) => image.url)],
    brand: { '@type': 'Brand', name: product.brand.name },
    sku: product.slug,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/produtos/${product.slug}`,
      priceCurrency: product.price.currency,
      price: (product.price.amountInCents / 100).toFixed(2),
      availability: product.variants.some((variant) => variant.stockQuantity > 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    ...(product.reviewCount > 0 &&
      product.averageRating !== null && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: product.averageRating,
          reviewCount: product.reviewCount,
        },
      }),
  };

  return (
    <main className="bg-bone-100">
      {/*
        JSON-LD derivado de nome/descrição do produto — hoje só editáveis via
        seed, mas destinados a virar campos administráveis no Módulo 6. Escapa
        "<" para "<" para que um valor contendo "</script>" não force o
        parser HTML a fechar a tag prematuramente (o conteúdo continua um JSON
        válido idêntico do ponto de vista do `JSON.parse`).
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c') }}
      />
      <RegisterProductView productId={product.id} />

      <Container className="py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: product.category.name, href: `/produtos?categoria=${product.category.slug}` },
            { label: product.name },
          ]}
        />

        <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <Gallery
            images={product.images}
            videoUrl={product.videoUrl}
            frames360={product.frames360}
            productName={product.name}
          />
          <ProductInfo product={product} />
        </div>
      </Container>

      <Container>
        <ReviewsSection
          productId={product.id}
          productSlug={product.slug}
          currentSearch={currentSearch}
        />
        <QuestionsSection
          productId={product.id}
          productSlug={product.slug}
          currentSearch={currentSearch}
        />
      </Container>

      <RelatedProducts products={related} />
      <RecentlyViewed excludeProductId={product.id} />

      {/* Preço formatado também em texto simples, fora do JSON-LD — ajuda crawlers que não processam script tags. */}
      <span className="sr-only">Preço: {formatMoney(product.price)}</span>
    </main>
  );
}
