import type { ProductSummary } from '@asn/types';
import { Container, Heading, Section } from '@asn/ui';
import { ProductCard } from '@/features/catalog/components/ProductCard/ProductCard';

export function RelatedProducts({ products }: { products: ProductSummary[] }) {
  if (products.length === 0) return null;

  return (
    <Section spacing="compact" className="border-t border-ink/10 bg-bone-50">
      <Container>
        <Heading as="h2" size="md" className="mb-8">
          Você também pode gostar
        </Heading>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
