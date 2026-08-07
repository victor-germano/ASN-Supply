import Image from 'next/image';
import type { SocialPost } from '@asn/types';
import { Container, Heading, Section, Text } from '@asn/ui';
import { InstagramIcon } from '@/components/icons';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';

export function SocialShowcase({ posts }: { posts: SocialPost[] }) {
  if (posts.length === 0) return null;

  return (
    <Section spacing="compact">
      <Container>
        <RevealOnScroll className="mb-10 flex flex-col items-center gap-2 text-center">
          <Heading as="h2" size="lg">
            @asnsupply
          </Heading>
          <Text tone="muted">Marque a gente pra aparecer aqui.</Text>
        </RevealOnScroll>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-6">
          {posts.map((post, index) => (
            <RevealOnScroll key={post.id} delay={index * 0.05}>
              <a
                href={post.permalink}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative block aspect-square overflow-hidden bg-bone-200"
                aria-label={post.caption ?? 'Ver publicação no Instagram'}
              >
                <Image
                  src={post.imageUrl}
                  alt={post.caption ?? 'Publicação da ASN Supply no Instagram'}
                  fill
                  sizes="(min-width: 1024px) 16vw, 33vw"
                  className="object-cover transition-transform duration-500 ease-premium group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors group-hover:bg-ink/30">
                  <InstagramIcon className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </a>
            </RevealOnScroll>
          ))}
        </div>
      </Container>
    </Section>
  );
}
