import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container, Heading } from '@asn/ui';
import { LoginForm } from '@/features/auth/components/LoginForm/LoginForm';
import { AuthBackground } from '@/components/layout/AuthBackground/AuthBackground';

/**
 * Rota deliberadamente não linkada em nenhum menu/nav público — só chega
 * aqui digitando a URL. `robots: noindex` some ela de buscadores. Não é
 * segurança por obscuridade sozinha: o middleware (`/admin/:path*`) exige
 * `Role.ADMIN` de verdade em todo o resto de `/admin`; isto aqui só evita
 * anunciar a existência de um painel administrativo pra quem não precisa
 * saber que ele existe.
 */
export const metadata: Metadata = {
  title: 'Administração',
  robots: { index: false, follow: false },
};

export default function AdminEntrarPage() {
  return (
    <AuthBackground>
      <Container className="flex min-h-[70dvh] items-center justify-center py-section">
        <div className="w-full max-w-sm">
          <Heading as="h1" size="lg" className="mb-8 text-center">
            Administração
          </Heading>
          <Suspense fallback={null}>
            <LoginForm defaultNext="/admin" showCreateAccountLink={false} />
          </Suspense>
        </div>
      </Container>
    </AuthBackground>
  );
}
