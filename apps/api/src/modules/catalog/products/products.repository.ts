import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../../../generated/client';
import type { ProductSummary } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';
import { toMoney } from '../common/money.mapper';
import type { ProductFeatureFilter } from './dto/list-products.query.dto';

const summaryInclude = {
  brand: true,
  category: true,
  images: { orderBy: { position: Prisma.SortOrder.asc } },
  variants: { select: { colorName: true } },
  reviews: { select: { rating: true } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof summaryInclude }>;

@Injectable()
export class ProductsRepository {
  private readonly logger = new Logger(ProductsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findFeatured(
    feature: ProductFeatureFilter | undefined,
    limit: number,
  ): Promise<ProductSummary[]> {
    const where: Prisma.ProductWhereInput = {
      isPublished: true,
      ...(feature === 'new-arrivals' && { isNewArrival: true }),
      ...(feature === 'best-sellers' && { isBestSeller: true }),
    };

    const products = await this.prisma.product.findMany({
      where,
      include: summaryInclude,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    // Um produto publicado sem nenhuma imagem é uma falha de conteúdo, não
    // um caso de uso válido de listagem — é excluído da vitrine (com log)
    // em vez de quebrar o endpoint inteiro para os demais produtos.
    const withImages = products.filter((product) => {
      if (product.images.length === 0) {
        this.logger.warn(
          `Produto ${product.id} (${product.slug}) publicado sem imagens — omitido da vitrine.`,
        );
        return false;
      }
      return true;
    });

    return withImages.map(toProductSummary);
  }
}

function toProductSummary(product: ProductWithRelations): ProductSummary {
  const primaryImage = product.images.find((image) => !image.isHoverImage) ?? product.images[0]!;
  const hoverImage = product.images.find((image) => image.isHoverImage) ?? null;
  const uniqueColors = new Set(product.variants.map((variant) => variant.colorName));
  const reviewCount = product.reviews.length;
  const averageRating =
    reviewCount > 0
      ? Math.round(
          (product.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10,
        ) / 10
      : null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: { id: product.brand.id, name: product.brand.name, slug: product.brand.slug },
    category: { id: product.category.id, name: product.category.name, slug: product.category.slug },
    price: toMoney(product.priceInCents),
    compareAtPrice:
      product.compareAtPriceInCents !== null ? toMoney(product.compareAtPriceInCents) : null,
    primaryImage: {
      id: primaryImage.id,
      url: primaryImage.url,
      alt: primaryImage.alt,
      width: primaryImage.width,
      height: primaryImage.height,
      position: primaryImage.position,
    },
    hoverImage: hoverImage && {
      id: hoverImage.id,
      url: hoverImage.url,
      alt: hoverImage.alt,
      width: hoverImage.width,
      height: hoverImage.height,
      position: hoverImage.position,
    },
    availableColors: uniqueColors.size,
    isNewArrival: product.isNewArrival,
    averageRating,
    reviewCount,
  };
}
