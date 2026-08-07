import Link from 'next/link';
import type { Metadata } from 'next';
import { Container, Heading, Text, buttonStyles } from '@asn/ui';

export const metadata: Metadata = {
  title: 'Carrinho',
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center bg-bone-100">
      <Container className="flex flex-col items-center gap-6 py-section text-center">
        <Heading as="h1" size="lg">
          Seu carrinho está vazio
        </Heading>
        <Text tone="muted" className="max-w-md">
          Explore os lançamentos e coleções da ASN Supply e encontre o próximo par para a sua
          rotação.
        </Text>
        <Link href="/" className={buttonStyles({ size: 'md' })}>
          Continuar explorando
        </Link>
      </Container>
    </main>
  );
}
