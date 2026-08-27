import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container, Heading } from '@asn/ui';
import { LoginForm } from '@/features/auth/components/LoginForm/LoginForm';
import { AuthBackground } from '@/components/layout/AuthBackground/AuthBackground';

export const metadata: Metadata = {
  title: 'Entrar',
  robots: { index: false, follow: false },
};

export default function EntrarPage() {
  return (
    <AuthBackground>
      <Container className="flex min-h-[70dvh] items-center justify-center py-section">
        <div className="w-full max-w-sm">
          <Heading as="h1" size="lg" className="mb-8 text-center">
            Entrar
          </Heading>
          {/* useSearchParams (ler ?next=) exige um limite de Suspense no App Router. */}
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </Container>
    </AuthBackground>
  );
}
