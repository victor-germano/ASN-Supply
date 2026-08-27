'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Container, Heading, Text, buttonStyles } from '@asn/ui';
import type { ProductDetail } from '@asn/types';
import { useCompareStore } from '@/stores/compareStore';
import { getProductBySlug } from '@/services/product.service';
import { formatMoney } from '@/lib/formatMoney';
import { StarIcon } from '@/components/icons';

const ROWS: { label: string; render: (product: ProductDetail) => React.ReactNode }[] = [
  { label: 'Marca', render: (p) => p.brand.name },
  { label: 'Preço', render: (p) => formatMoney(p.price) },
  {
    label: 'Avaliação',
    render: (p) =>
      p.averageRating !== null ? (
        <span className="flex items-center gap-1">
          <StarIcon className="h-3.5 w-3.5 text-olive-500" />
          {p.averageRating.toFixed(1)} ({p.reviewCount})
        </span>
      ) : (
        '—'
      ),
  },
  { label: 'Gênero', render: (p) => GENDER_LABEL[p.gender] },
  { label: 'Materiais', render: (p) => (p.materials.length > 0 ? p.materials.join(', ') : '—') },
  {
    label: 'Tecnologias',
    render: (p) => (p.technologies.length > 0 ? p.technologies.join(', ') : '—'),
  },
  {
    label: 'Tamanhos disponíveis',
    render: (p) => {
      const sizes = Array.from(
        new Set(p.variants.filter((v) => v.stockQuantity > 0).map((v) => v.size)),
      );
      return sizes.length > 0 ? sizes.join(', ') : 'Sem estoque no momento';
    },
  },
  { label: 'Cores', render: (p) => String(new Set(p.variants.map((v) => v.colorName)).size) },
];

const GENDER_LABEL: Record<ProductDetail['gender'], string> = {
  MASCULINO: 'Masculino',
  FEMININO: 'Feminino',
  UNISSEX: 'Unissex',
  INFANTIL: 'Infantil',
};

export function CompareView() {
  const hasHydrated = useCompareStore((state) => state.hasHydrated);
  const entries = useCompareStore((state) => state.items);
  const remove = useCompareStore((state) => state.remove);

  const { data: products, isLoading } = useQuery({
    queryKey: ['compare', entries.map((e) => e.slug)],
    queryFn: async () => {
      const results = await Promise.all(entries.map((entry) => getProductBySlug(entry.slug)));
      return results.filter((p): p is ProductDetail => p !== null);
    },
    enabled: hasHydrated && entries.length > 0,
  });

  if (!hasHydrated) return null;

  if (entries.length < 2) {
    return (
      <main className="flex min-h-[60dvh] flex-col items-center justify-center bg-bone-100">
        <Container className="flex flex-col items-center gap-6 py-section text-center">
          <Heading as="h1" size="lg">
            Escolha ao menos 2 produtos para comparar
          </Heading>
          <Text tone="muted" className="max-w-md">
            Na listagem de produtos, use o ícone de comparação no canto de cada card.
          </Text>
          <Link href="/produtos" className={buttonStyles({ size: 'md' })}>
            Ver produtos
          </Link>
        </Container>
      </main>
    );
  }

  return (
    <main className="bg-bone-100">
      <Container className="py-section">
        <Heading as="h1" size="lg" className="mb-8">
          Comparar produtos
        </Heading>

        {isLoading || !products ? (
          <Text tone="muted">Carregando...</Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="w-32" />
                  {products.map((product) => (
                    <th key={product.id} className="px-4 pb-4 align-top">
                      <div className="relative mb-3 aspect-[4/5] w-full max-w-[160px] overflow-hidden bg-bone-200">
                        <Image
                          src={product.primaryImage.url}
                          alt={product.primaryImage.alt}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      </div>
                      <Link
                        href={`/produtos/${product.slug}`}
                        className="font-medium hover:text-olive-600"
                      >
                        {product.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(product.id)}
                        className="mt-1 block text-xs text-ink-muted underline underline-offset-4 hover:text-error"
                      >
                        Remover
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-t border-ink/10">
                    <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {row.label}
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="px-4 py-3">
                        {row.render(product)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </main>
  );
}
