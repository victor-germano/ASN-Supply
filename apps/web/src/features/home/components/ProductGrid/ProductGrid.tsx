import type { ProductSummary } from '@asn/types';
import { Container, Heading, Section, Text } from '@asn/ui';
import { ProductCard } from '@/features/catalog/components/ProductCard/ProductCard';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';

export interface ProductGridProps {
  id: string;
  title: string;
  subtitle?: string;
  products: ProductSummary[];
}

/**
 * Seção de vitrine de produtos — usada tanto por "Lançamentos" quanto por
 * "Mais Vendidos" na Home (mesmo padrão visual, fonte de dados diferente),
 * evitando duas seções quase-idênticas no código.
 */
export function ProductGrid({ id, title, subtitle, products }: ProductGridProps) {
  if (products.length === 0) return null;

  return (
    <Section id={id}>
      <Container>
        <RevealOnScroll className="mb-10 flex flex-col items-center gap-2 text-center">
          <Heading as="h2" size="lg">
            {title}
          </Heading>
          {subtitle && (
            <Text tone="muted" className="max-w-md">
              {subtitle}
            </Text>
          )}
        </RevealOnScroll>

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product, index) => (
            <RevealOnScroll key={product.id} delay={index * 0.05}>
              <ProductCard product={product} priority={index < 2} />
            </RevealOnScroll>
          ))}
        </div>
      </Container>
    </Section>
  );
}
