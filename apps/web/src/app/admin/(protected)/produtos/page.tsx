import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading, buttonStyles } from '@asn/ui';
import { getAdminProducts } from '@/services/adminProducts.service';
import { ProductsTable } from '@/features/admin/components/ProductsTable/ProductsTable';

export const metadata: Metadata = {
  title: 'Produtos — Administração',
  robots: { index: false, follow: false },
};

export default async function AdminProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const result = await getAdminProducts({ page, pageSize: 20, q: params.q });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Heading as="h1" size="lg">
          Produtos
        </Heading>
        <Link href="/admin/produtos/novo" className={buttonStyles({ size: 'md' })}>
          Novo produto
        </Link>
      </div>

      <form className="mb-6 max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Buscar por nome..."
          className="h-11 w-full border border-ink/15 bg-transparent px-4 text-sm text-ink placeholder:text-ink-muted focus-visible:border-ink focus-visible:outline-none"
        />
      </form>

      <ProductsTable products={result.items} />

      {result.totalPages > 1 && (
        <div className="mt-6 flex items-center gap-4 text-sm">
          {page > 1 && (
            <Link href={`/admin/produtos?page=${page - 1}${params.q ? `&q=${params.q}` : ''}`}>
              ← Anterior
            </Link>
          )}
          <span className="text-ink-muted">
            Página {result.page} de {result.totalPages}
          </span>
          {page < result.totalPages && (
            <Link href={`/admin/produtos?page=${page + 1}${params.q ? `&q=${params.q}` : ''}`}>
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
