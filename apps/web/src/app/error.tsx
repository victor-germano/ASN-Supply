'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { Button, Container, Heading, Text, buttonStyles } from '@asn/ui';

/**
 * Error boundary de rota (Next.js App Router) — pega qualquer erro não
 * tratado (ex: a API retornar um erro inesperado) e mostra um estado
 * consistente com a marca em vez da tela de erro genérica do Next.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center bg-bone-100">
      <Container className="flex flex-col items-center gap-6 py-section text-center">
        <Heading as="h1" size="lg">
          Algo deu errado por aqui
        </Heading>
        <Text tone="muted" className="max-w-md">
          Não conseguimos carregar essa página agora. Tente novamente em instantes.
        </Text>
        <div className="flex gap-3">
          <Button size="md" onClick={reset}>
            Tentar novamente
          </Button>
          <Link href="/" className={buttonStyles({ variant: 'secondary', size: 'md' })}>
            Voltar para a Home
          </Link>
        </div>
      </Container>
    </main>
  );
}
