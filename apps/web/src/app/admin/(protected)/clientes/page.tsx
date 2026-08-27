import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading, Text } from '@asn/ui';
import { getAdminUsers } from '@/services/adminUsers.service';
import { getCurrentUser } from '@/services/auth.service';
import { UsersTable } from '@/features/admin/components/UsersTable/UsersTable';

export const metadata: Metadata = {
  title: 'Clientes — Administração',
  robots: { index: false, follow: false },
};

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  // `AdminLayout` (rota pai) já garante ADMIN antes de chegar aqui — `user`
  // só é `null` num vácuo teórico (cookie apagado entre o layout e esta
  // página); `currentUserId` cai pra string vazia nesse caso, o que
  // simplesmente não desabilita nenhuma linha da tabela, sem quebrar nada.
  const [result, user] = await Promise.all([
    getAdminUsers({ page, pageSize: 20, q: params.q }),
    getCurrentUser(),
  ]);

  return (
    <div>
      <Heading as="h1" size="lg" className="mb-2">
        Clientes
      </Heading>
      <Text tone="muted" className="mb-6">
        Papel controla o acesso ao painel — só ADMIN entra em `/admin`.
      </Text>

      <form className="mb-6 max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Buscar por nome ou e-mail..."
          className="h-11 w-full border border-ink/15 bg-transparent px-4 text-sm text-ink placeholder:text-ink-muted focus-visible:border-ink focus-visible:outline-none"
        />
      </form>

      <UsersTable users={result.items} currentUserId={user?.id ?? ''} />

      {result.totalPages > 1 && (
        <div className="mt-6 flex items-center gap-4 text-sm">
          {page > 1 && (
            <Link href={`/admin/clientes?page=${page - 1}${params.q ? `&q=${params.q}` : ''}`}>
              ← Anterior
            </Link>
          )}
          <span className="text-ink-muted">
            Página {result.page} de {result.totalPages}
          </span>
          {page < result.totalPages && (
            <Link href={`/admin/clientes?page=${page + 1}${params.q ? `&q=${params.q}` : ''}`}>
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
