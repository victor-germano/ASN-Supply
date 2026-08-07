import Image from 'next/image';
import Link from 'next/link';
import type { Category } from '@asn/types';
import { Container, Heading, Section, Text } from '@asn/ui';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';

export function Categories({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <Section id="categorias" spacing="compact">
      <Container>
        <RevealOnScroll className="mb-10">
          <Heading as="h2" size="lg" className="text-center">
            Categorias
          </Heading>
        </RevealOnScroll>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((category, index) => (
            <RevealOnScroll key={category.id} delay={index * 0.06}>
              <Link href={`/produtos?categoria=${category.slug}`} className="group block">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-bone-200">
                  {category.image && (
                    <Image
                      src={category.image.url}
                      alt={category.image.alt}
                      fill
                      sizes="(min-width: 640px) 22vw, 45vw"
                      className="object-cover transition-transform duration-700 ease-premium group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-ink/20 transition-colors group-hover:bg-ink/35" />
                  <Text
                    weight="medium"
                    className="absolute inset-x-0 bottom-4 text-center text-white"
                  >
                    {category.name}
                  </Text>
                </div>
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </Container>
    </Section>
  );
}
