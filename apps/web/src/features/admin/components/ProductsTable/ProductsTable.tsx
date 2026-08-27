'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AdminProductListItem } from '@asn/types';
import { Badge, Text, buttonStyles } from '@asn/ui';
import { formatMoney } from '@/lib/formatMoney';
import { deleteAdminProductAction } from '@/actions/adminProducts';

export function ProductsTable({ products }: { products: AdminProductListItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(product: AdminProductListItem) {
    if (!window.confirm(`Excluir "${product.name}"? Essa ação não pode ser desfeita.`)) return;
    setError(null);
    setPendingId(product.id);
    try {
      const result = await deleteAdminProductAction(product.id);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (products.length === 0) {
    return <Text tone="muted">Nenhum produto cadastrado ainda.</Text>;
  }

  return (
    <div>
      {error && (
        <Text size="sm" className="mb-4 text-error" role="alert">
          {error}
        </Text>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-xs uppercase tracking-wider text-ink-muted">
              <th className="py-3 pr-4">Produto</th>
              <th className="py-3 pr-4">Marca</th>
              <th className="py-3 pr-4">Categoria</th>
              <th className="py-3 pr-4">Preço</th>
              <th className="py-3 pr-4">Estoque</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-ink/5">
                <td className="py-3 pr-4">
                  <Link href={`/admin/produtos/${product.id}`} className="hover:text-olive-600">
                    {product.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-ink-muted">{product.brandName}</td>
                <td className="py-3 pr-4 text-ink-muted">{product.categoryName}</td>
                <td className="py-3 pr-4">
                  {formatMoney({ amountInCents: product.priceInCents, currency: 'BRL' })}
                </td>
                <td className="py-3 pr-4">{product.totalStock}</td>
                <td className="py-3 pr-4">
                  <Badge tone={product.isPublished ? 'olive' : 'outline'}>
                    {product.isPublished ? 'Publicado' : 'Rascunho'}
                  </Badge>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/produtos/${product.id}`}
                      className={buttonStyles({ size: 'sm', variant: 'secondary' })}
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      disabled={pendingId === product.id}
                      onClick={() => handleDelete(product)}
                      className="text-xs text-ink-muted underline underline-offset-4 hover:text-error disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
