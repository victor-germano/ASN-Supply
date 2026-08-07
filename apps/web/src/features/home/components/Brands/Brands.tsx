import Image from 'next/image';
import type { Brand } from '@asn/types';
import { Container, Section } from '@asn/ui';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';

/**
 * Sem logotipos cadastrados, cada marca é exibida como wordmark tipográfico
 * — decisão deliberada (evita esticar/recortar um logo inexistente), não
 * um placeholder. Quando `logoUrl` existir, a imagem substitui o texto.
 */
export function Brands({ brands }: { brands: Brand[] }) {
  if (brands.length === 0) return null;

  return (
    <Section spacing="compact" className="border-y border-ink/10">
      <Container>
        <RevealOnScroll className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8">
          {brands.map((brand) =>
            brand.logoUrl ? (
              <Image
                key={brand.id}
                src={brand.logoUrl}
                alt={brand.name}
                width={120}
                height={40}
                className="h-8 w-auto opacity-60 grayscale transition-opacity hover:opacity-100"
              />
            ) : (
              <span
                key={brand.id}
                className="font-display text-xl tracking-tight text-ink-muted transition-colors hover:text-ink"
              >
                {brand.name}
              </span>
            ),
          )}
        </RevealOnScroll>
      </Container>
    </Section>
  );
}
