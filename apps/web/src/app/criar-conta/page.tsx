import type { Metadata } from 'next';
import { Container, Heading } from '@asn/ui';
import { RegisterForm } from '@/features/auth/components/RegisterForm/RegisterForm';

export const metadata: Metadata = {
  title: 'Criar conta',
  robots: { index: false, follow: false },
};

export default function CriarContaPage() {
  return (
    <main className="bg-bone-100">
      <Container className="flex min-h-[70dvh] items-center justify-center py-section">
        <div className="w-full max-w-sm">
          <Heading as="h1" size="lg" className="mb-8 text-center">
            Criar conta
          </Heading>
          <RegisterForm />
        </div>
      </Container>
    </main>
  );
}
