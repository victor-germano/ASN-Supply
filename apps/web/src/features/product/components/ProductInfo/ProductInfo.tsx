import Link from 'next/link';
import type { ProductDetail } from '@asn/types';
import { Heading, Text } from '@asn/ui';
import { formatMoney } from '@/lib/formatMoney';
import { StarIcon } from '@/components/icons';
import { ProductActions } from '@/features/product/components/ProductActions/ProductActions';
import { SizeGuideTable } from '@/features/product/components/SizeGuideTable/SizeGuideTable';

export function ProductInfo({ product }: { product: ProductDetail }) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Text size="sm" className="mb-2 uppercase tracking-wider text-ink-muted">
          {product.brand.name}
        </Text>
        <Heading as="h1" size="lg" className="mb-3">
          {product.name}
        </Heading>

        <div className="flex flex-wrap items-center gap-3">
          <Text weight="semibold" size="lg">
            {formatMoney(product.price)}
          </Text>
          {product.compareAtPrice && (
            <Text tone="muted" className="line-through">
              {formatMoney(product.compareAtPrice)}
            </Text>
          )}
        </div>

        {product.reviewCount > 0 && product.averageRating !== null && (
          <Link
            href="#avaliacoes"
            className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
          >
            <span className="flex gap-0.5 text-olive-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`h-3.5 w-3.5 ${star <= Math.round(product.averageRating!) ? '' : 'text-ink/15'}`}
                />
              ))}
            </span>
            {product.averageRating.toFixed(1)} · {product.reviewCount}{' '}
            {product.reviewCount === 1 ? 'avaliação' : 'avaliações'}
          </Link>
        )}
      </div>

      <ProductActions product={product} />

      <div className="flex flex-col gap-3 border-t border-ink/10 pt-6">
        <Heading as="h2" size="sm">
          Descrição
        </Heading>
        <Text tone="muted">{product.description}</Text>
      </div>

      {product.materials.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-ink/10 pt-6">
          <Heading as="h2" size="sm">
            Materiais
          </Heading>
          <ul className="flex flex-col gap-1">
            {product.materials.map((material) => (
              <li key={material}>
                <Text tone="muted" size="sm">
                  {material}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      )}

      {product.technologies.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-ink/10 pt-6">
          <Heading as="h2" size="sm">
            Tecnologias
          </Heading>
          <ul className="flex flex-wrap gap-2">
            {product.technologies.map((technology) => (
              <li
                key={technology}
                className="rounded-full border border-ink/15 px-3 py-1 text-xs text-ink-muted"
              >
                {technology}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-ink/10 pt-6">
        <SizeGuideTable />
      </div>
    </div>
  );
}
