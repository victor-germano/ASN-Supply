import Image from 'next/image';
import Link from 'next/link';
import type { Collection } from '@asn/types';
import { Container, Heading, Section, Text } from '@asn/ui';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';

export function Collections({ collections }: { collections: Collection[] }) {
  if (collections.length === 0) return null;

  return (
    <Section id="colecoes" className="bg-bone-50">
      <Container>
        <RevealOnScroll className="mb-10 flex flex-col items-center gap-2 text-center">
          <Heading as="h2" size="lg">
            Coleções
          </Heading>
          <Text tone="muted" className="max-w-md">
            Cápsulas com identidade própria — cada uma com um propósito, nenhuma genérica.
          </Text>
        </RevealOnScroll>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection, index) => (
            <RevealOnScroll key={collection.id} delay={index * 0.08}>
              {/* prefetch desligado: /colecoes/[slug] ainda não existe (Módulo 2). */}
              <Link href={`/colecoes/${collection.slug}`} prefetch={false} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-bone-200">
                  {collection.coverImage && (
                    <Image
                      src={collection.coverImage.url}
                      alt={collection.coverImage.alt}
                      fill
                      sizes="(min-width: 1024px) 32vw, 90vw"
                      className="object-cover transition-transform duration-700 ease-premium group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/70 via-transparent to-transparent p-6">
                    <Heading as="h3" size="md" className="text-white">
                      {collection.name}
                    </Heading>
                    <Text size="sm" className="mt-1 line-clamp-2 text-white/80">
                      {collection.description}
                    </Text>
                  </div>
                </div>
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </Container>
    </Section>
  );
}
