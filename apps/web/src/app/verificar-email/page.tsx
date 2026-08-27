import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container, Heading } from '@asn/ui';
import { VerifyEmailStatus } from '@/features/auth/components/VerifyEmailStatus/VerifyEmailStatus';

export const metadata: Metadata = {
  title: 'Confirmar e-mail',
  robots: { index: false, follow: false },
};

export default function VerificarEmailPage() {
  return (
    <main className="bg-bone-100">
      <Container className="flex min-h-[70dvh] items-center justify-center py-section">
        <div className="w-full max-w-sm">
          <Heading as="h1" size="lg" className="mb-8 text-center">
            Confirmar e-mail
          </Heading>
          <Suspense fallback={null}>
            <VerifyEmailStatus />
          </Suspense>
        </div>
      </Container>
    </main>
  );
}
