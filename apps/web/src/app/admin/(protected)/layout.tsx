import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@asn/ui';
import { getCurrentUser } from '@/services/auth.service';
import { LogoutButton } from '@/features/auth/components/LogoutButton/LogoutButton';

/**
 * Mesmo padrão de `conta/layout.tsx`: o middleware (`/admin/:path*`) já
 * exige `Role.ADMIN` antes desta camada rodar — isto aqui é defesa em
 * profundidade (cookie válido mas não corresponde a ninguém, ou papel
 * mudou entre o token ser emitido e agora). Diferença de propósito: quem
 * cai aqui sem ser ADMIN (inclusive um CUSTOMER autenticado) volta pra `/`
 * em silêncio, não pra `/admin/entrar` — não faz sentido "convidar" um
 * cliente comum a tentar logar numa área administrativa que não é dele.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/admin/entrar');
  }
  if (user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <main className="bg-bone-100">
      <Container className="grid grid-cols-1 gap-10 py-section lg:grid-cols-[200px_1fr]">
        <nav aria-label="Administração" className="flex flex-col gap-4">
          <Link href="/admin" className="text-sm text-ink hover:text-olive-600">
            Painel
          </Link>
          <Link href="/admin/produtos" className="text-sm text-ink hover:text-olive-600">
            Produtos
          </Link>
          <Link href="/admin/pedidos" className="text-sm text-ink hover:text-olive-600">
            Pedidos
          </Link>
          <LogoutButton className="text-left text-sm text-ink-muted hover:text-error" />
        </nav>
        <div>{children}</div>
      </Container>
    </main>
  );
}
