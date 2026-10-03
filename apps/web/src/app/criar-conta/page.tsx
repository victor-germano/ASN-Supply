import type { Metadata } from 'next';
import { Container, Heading } from '@asn/ui';
import { RegisterForm } from '@/features/auth/components/RegisterForm/RegisterForm';
import { AuthBackground } from '@/components/layout/AuthBackground/AuthBackground';

export const metadata: Metadata = {
  title: 'Criar conta',
  robots: { index: false, follow: false },
};

export default function CriarContaPage() {
  return (
    <AuthBackground>
      <Container className="flex min-h-[70dvh] items-center justify-center py-section">
        <div className="w-full max-w-2xl">
          <Heading as="h1" size="lg" className="mb-2 text-center">
            Criar conta
          </Heading>
          <p className="mb-10 text-center text-sm text-ink-muted">
            Leva menos de 2 minutos. Seu endereço já fica salvo para as próximas compras.
          </p>
          <RegisterForm />
        </div>
      </Container>
    </AuthBackground>
  );
}
