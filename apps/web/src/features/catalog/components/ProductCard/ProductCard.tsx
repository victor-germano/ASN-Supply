import Link from 'next/link';
import Image from 'next/image';
import type { ProductSummary } from '@asn/types';
import { Badge, Text } from '@asn/ui';
import { formatMoney } from '@/lib/formatMoney';
import { StarIcon } from '@/components/icons';

function calculateDiscountPercent(
  price: ProductSummary['price'],
  compareAtPrice: ProductSummary['compareAtPrice'],
): number | null {
  if (!compareAtPrice || compareAtPrice.amountInCents <= price.amountInCents) return null;
  return Math.round((1 - price.amountInCents / compareAtPrice.amountInCents) * 100);
}

export interface ProductCardProps {
  product: ProductSummary;
  /** Prioriza o carregamento da imagem (usar nos primeiros cards acima da dobra). */
  priority?: boolean;
}

/**
 * Card de produto reutilizado em Home, Listagem (Módulo 2) e Relacionados
 * (Módulo 3). Troca de imagem no hover é puro CSS (crossfade de opacidade)
 * — nenhum estado de React necessário para a interação mais comum do grid.
 */
export function ProductCard({ product, priority = false }: ProductCardProps) {
  const discountPercent = calculateDiscountPercent(product.price, product.compareAtPrice);

  return (
    // prefetch desligado: a rota /produtos/[slug] (Módulo 3) ainda não
    // existe — sem isso, o Next tenta prefetch no viewport e gera 404 real
    // no console a cada carregamento da Home, mesmo sem clique nenhum.
    <Link href={`/produtos/${product.slug}`} prefetch={false} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-bone-200">
        <Image
          src={product.primaryImage.url}
          alt={product.primaryImage.alt}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 45vw"
          className="object-cover transition-opacity duration-500 ease-premium group-hover:opacity-0"
        />
        {product.hoverImage && (
          <Image
            src={product.hoverImage.url}
            alt={product.hoverImage.alt}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 45vw"
            className="object-cover opacity-0 transition-opacity duration-500 ease-premium group-hover:opacity-100"
          />
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {product.isNewArrival && <Badge tone="olive">Novo</Badge>}
          {discountPercent !== null && <Badge tone="error">-{discountPercent}%</Badge>}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <Text size="xs" tone="muted" className="uppercase tracking-wider">
          {product.brand.name}
        </Text>
        <Text weight="medium" className="line-clamp-1">
          {product.name}
        </Text>

        <div className="flex items-center gap-2">
          <Text weight="semibold">{formatMoney(product.price)}</Text>
          {product.compareAtPrice && (
            <Text size="sm" tone="muted" className="line-through">
              {formatMoney(product.compareAtPrice)}
            </Text>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between">
          {product.availableColors > 1 && (
            <Text size="xs" tone="muted">
              +{product.availableColors} cores
            </Text>
          )}
          {product.reviewCount > 0 && product.averageRating !== null && (
            <span className="flex items-center gap-1 text-xs text-ink-muted">
              <StarIcon className="h-3 w-3 text-olive-500" />
              {product.averageRating.toFixed(1)} ({product.reviewCount})
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
