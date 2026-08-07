import Image from 'next/image';
import { Container, Heading, Section, Text } from '@asn/ui';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';

export function AboutBrand({ imageUrl }: { imageUrl: string }) {
  return (
    <Section id="sobre">
      <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <RevealOnScroll className="relative aspect-[4/5] overflow-hidden">
          <Image
            src={imageUrl}
            alt="Estúdio ASN Supply — bastidores de curadoria"
            fill
            sizes="(min-width: 1024px) 45vw, 90vw"
            className="object-cover"
          />
        </RevealOnScroll>

        <RevealOnScroll className="flex flex-col gap-5" delay={0.1}>
          <Text size="sm" className="uppercase tracking-widest text-olive-600">
            Nossa história
          </Text>
          <Heading as="h2" size="lg">
            Curadoria, não catálogo.
          </Heading>
          <Text tone="muted">
            A ASN Supply nasceu de uma inquietação simples: lojas de tênis viraram vitrines de tudo,
            para todo mundo. Decidimos fazer o oposto — uma seleção pequena, renovada com
            frequência, de peças que resistem à moda passageira.
          </Text>
          <Text tone="muted">
            Trabalhamos direto com estúdios independentes e marcas emergentes, priorizando
            construção e material sobre volume. Cada coleção tem começo, meio e fim — quando acaba,
            não volta.
          </Text>
        </RevealOnScroll>
      </Container>
    </Section>
  );
}
