import type { Metadata } from 'next';
import { Container, Heading } from '@asn/ui';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Esqueci minha senha',
  robots: { index: false, follow: false },
};

export default function EsqueciSenhaPage() {
  return (
    <main className="bg-bone-100">
      <Container className="flex min-h-[70dvh] items-center justify-center py-section">
        <div className="w-full max-w-sm">
          <Heading as="h1" size="lg" className="mb-8 text-center">
            Esqueci minha senha
          </Heading>
          <ForgotPasswordForm />
        </div>
      </Container>
    </main>
  );
}
