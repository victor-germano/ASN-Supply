import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@asn/ui';
import { getCurrentUser } from '@/services/auth.service';
import { LogoutButton } from '@/features/auth/components/LogoutButton/LogoutButton';

/**
 * O middleware (`middleware.ts`, matcher `/conta/:path*`) já garante um
 * `asn_at` válido antes desta camada rodar — este `redirect` é defesa em
 * profundidade para o caso raro de o cookie existir mas não corresponder a
 * ninguém (ex: usuário apagado). Sem `next=` aqui de propósito: o fluxo
 * comum de "sessão expirada" já é tratado pelo middleware, que sabe o
 * caminho exato; este fallback não tem como saber com a mesma certeza.
 */
export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/entrar');
  }

  return (
    <main className="bg-bone-100">
      <Container className="grid grid-cols-1 gap-10 py-section lg:grid-cols-[200px_1fr]">
        <nav aria-label="Minha conta" className="flex flex-col gap-4">
          <Link href="/conta/pedidos" className="text-sm text-ink hover:text-olive-600">
            Meus pedidos
          </Link>
          <Link href="/conta/enderecos" className="text-sm text-ink hover:text-olive-600">
            Meus endereços
          </Link>
          <LogoutButton className="text-left text-sm text-ink-muted hover:text-error" />
        </nav>
        <div>{children}</div>
      </Container>
    </main>
  );
}
