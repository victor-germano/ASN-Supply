import type { Metadata } from 'next';
import { Container, Heading } from '@asn/ui';
import { GoogleCallbackClient } from './GoogleCallbackClient';

export const metadata: Metadata = {
  title: 'Entrando...',
  robots: { index: false, follow: false },
};

export default function GoogleCallbackPage() {
  return (
    <main className="bg-bone-100">
      <Container className="flex min-h-[70dvh] items-center justify-center py-section">
        <div className="w-full max-w-sm text-center">
          <Heading as="h1" size="lg" className="mb-8">
            Só um instante
          </Heading>
          <GoogleCallbackClient />
        </div>
      </Container>
    </main>
  );
}
