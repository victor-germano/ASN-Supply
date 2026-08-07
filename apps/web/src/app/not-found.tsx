import Link from 'next/link';
import { Container, Heading, Text, buttonStyles } from '@asn/ui';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bone-100">
      <Container className="flex flex-col items-center gap-6 text-center">
        <span className="font-display text-8xl text-olive-400">404</span>
        <Heading as="h1" size="lg">
          Essa página saiu de linha.
        </Heading>
        <Text tone="muted" className="max-w-md">
          O produto ou página que você procura não está mais disponível. Volte para a vitrine
          principal e continue explorando.
        </Text>
        <Link href="/" className={buttonStyles({ size: 'md' })}>
          Voltar para a Home
        </Link>
      </Container>
    </main>
  );
}
