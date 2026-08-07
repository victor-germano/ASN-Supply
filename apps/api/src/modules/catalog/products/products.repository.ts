import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../../../generated/client';
import type { PaginatedResult, ProductFacets, ProductFilters, ProductSummary } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';
import { toMoney } from '../common/money.mapper';
import type { ProductFeatureFilter } from './dto/list-products.query.dto';

const summaryInclude = {
  brand: true,
  category: true,
  images: { orderBy: { position: Prisma.SortOrder.asc } },
  variants: { select: { colorName: true } },
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
      images: { some: {} },
      ...(feature === 'new-arrivals' && { isNewArrival: true }),
      ...(feature === 'best-sellers' && { isBestSeller: true }),
    };

    const products = await this.prisma.product.findMany({
      where,
      include: summaryInclude,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    return this.withImages(products).map(toProductSummary);
  }

  /** Listagem completa da PLP: filtros + ordenação + paginação real no banco. */
  async search(
    filters: ProductFilters,
    pagination: { page: number; pageSize: number },
  ): Promise<PaginatedResult<ProductSummary>> {
    const where = this.buildWhere(filters);
    const orderBy = this.buildOrderBy(filters.sort);

    const [totalItems, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: summaryInclude,
        orderBy,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
    ]);

    return {
      items: this.withImages(products).map(toProductSummary),
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pagination.pageSize)),
    };
  }

  /**
   * Opções disponíveis para montar os filtros da PLP. Calculadas sobre todo
   * o catálogo publicado — ver nota em `ProductFacets` (@asn/types) sobre a
   * limitação deliberada de não re-estreitar por seleção atual.
   */
  async getFacets(): Promise<ProductFacets> {
    const [brandGroups, categoryGroups, genderGroups, variantGroups, priceAgg] = await Promise.all([
      this.prisma.product.groupBy({
        by: ['brandId'],
        where: { isPublished: true },
        _count: { _all: true },
      }),
      this.prisma.product.groupBy({
        by: ['categoryId'],
        where: { isPublished: true },
        _count: { _all: true },
      }),
      this.prisma.product.groupBy({
        by: ['gender'],
        where: { isPublished: true },
        _count: { _all: true },
      }),
      this.prisma.productVariant.groupBy({
        by: ['colorName', 'colorHex', 'size'],
        where: { product: { isPublished: true } },
        _count: { _all: true },
      }),
      this.prisma.product.aggregate({
        where: { isPublished: true },
        _min: { priceInCents: true },
        _max: { priceInCents: true },
      }),
    ]);

    const [brands, categories] = await Promise.all([
      this.prisma.brand.findMany({ where: { id: { in: brandGroups.map((g) => g.brandId) } } }),
      this.prisma.category.findMany({
        where: { id: { in: categoryGroups.map((g) => g.categoryId) } },
      }),
    ]);
    const brandById = new Map(brands.map((brand) => [brand.id, brand]));
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    const colorCounts = new Map<string, { hex: string; count: number }>();
    const sizeCounts = new Map<string, number>();
    for (const group of variantGroups) {
      const existingColor = colorCounts.get(group.colorName);
      colorCounts.set(group.colorName, {
        hex: group.colorHex,
        count: (existingColor?.count ?? 0) + group._count._all,
      });
      sizeCounts.set(group.size, (sizeCounts.get(group.size) ?? 0) + group._count._all);
    }

    return {
      brands: brandGroups
        .map((group) => {
          const brand = brandById.get(group.brandId);
          return brand ? { slug: brand.slug, label: brand.name, count: group._count._all } : null;
        })
        .filter((option): option is NonNullable<typeof option> => option !== null)
        .sort((a, b) => a.label.localeCompare(b.label)),
      categories: categoryGroups
        .map((group) => {
          const category = categoryById.get(group.categoryId);
          return category
            ? { slug: category.slug, label: category.name, count: group._count._all }
            : null;
        })
        .filter((option): option is NonNullable<typeof option> => option !== null)
        .sort((a, b) => a.label.localeCompare(b.label)),
      colors: Array.from(colorCounts.entries())
        .map(([name, { hex, count }]) => ({ name, hex, count }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      sizes: Array.from(sizeCounts.entries())
        .map(([size, count]) => ({ size, count }))
        .sort((a, b) => Number(a.size) - Number(b.size)),
      genders: genderGroups.map((group) => ({ value: group.gender, count: group._count._all })),
      priceRange: {
        minInCents: priceAgg._min.priceInCents ?? 0,
        maxInCents: priceAgg._max.priceInCents ?? 0,
      },
    };
  }

  private buildWhere(filters: ProductFilters): Prisma.ProductWhereInput {
    // `images: { some: {} }` garante que a contagem usada para paginar
    // (totalItems/totalPages) e os itens de fato retornados nunca
    // divirjam: sem isto, um produto publicado sem imagem entraria no
    // COUNT mas seria descartado depois por `withImages`, podendo deixar
    // uma página "válida" com menos itens do que a paginação promete.
    const where: Prisma.ProductWhereInput = { isPublished: true, images: { some: {} } };

    if (filters.brandSlugs?.length) where.brand = { slug: { in: filters.brandSlugs } };
    if (filters.categorySlugs?.length) where.category = { slug: { in: filters.categorySlugs } };
    if (filters.collectionSlugs?.length) {
      where.collection = { slug: { in: filters.collectionSlugs } };
    }
    if (filters.genders?.length) where.gender = { in: filters.genders };
    if (filters.minPriceInCents !== undefined || filters.maxPriceInCents !== undefined) {
      where.priceInCents = {
        ...(filters.minPriceInCents !== undefined && { gte: filters.minPriceInCents }),
        ...(filters.maxPriceInCents !== undefined && { lte: filters.maxPriceInCents }),
      };
    }
    if (filters.colorNames?.length) {
      where.variants = { ...where.variants, some: { colorName: { in: filters.colorNames } } };
    }
    if (filters.sizes?.length) {
      // `AND` explícito: cada condição de variante é avaliada independentemente
      // (produto tem ALGUMA variante nessa cor E ALGUMA variante nesse tamanho —
      // não necessariamente a mesma variante). Comportamento padrão de filtro
      // combinado em PLPs de e-commerce.
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        { variants: { some: { size: { in: filters.sizes } } } },
      ];
    }
    if (filters.query?.trim()) {
      const query = filters.query.trim();
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { brand: { name: { contains: query, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  private buildOrderBy(sort: ProductFilters['sort']): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'PRICE_ASC':
        return [{ priceInCents: 'asc' }];
      case 'PRICE_DESC':
        return [{ priceInCents: 'desc' }];
      case 'BEST_SELLING':
        return [{ isBestSeller: 'desc' }, { publishedAt: 'desc' }];
      case 'TOP_RATED':
        // Todo produto sem avaliação tem averageRating null — fica atrás dos
        // avaliados independentemente da direção do sort.
        return [{ averageRating: { sort: 'desc', nulls: 'last' } }, { publishedAt: 'desc' }];
      case 'NEWEST':
      case 'RELEVANCE':
      default:
        // RELEVANCE sem um mecanismo de full-text ranking (fora de escopo
        // nesta fase) cai para "mais recente primeiro" — o filtro por texto
        // já restringe o resultado, só não há pontuação de relevância.
        return [{ publishedAt: 'desc' }];
    }
  }

  /** Produto publicado sem imagem é falha de conteúdo — omitido (com log) em vez de quebrar a listagem inteira. */
  private withImages(products: ProductWithRelations[]): ProductWithRelations[] {
    return products.filter((product) => {
      if (product.images.length === 0) {
        this.logger.warn(
          `Produto ${product.id} (${product.slug}) publicado sem imagens — omitido da vitrine.`,
        );
        return false;
      }
      return true;
    });
  }
}

function toProductSummary(product: ProductWithRelations): ProductSummary {
  const primaryImage = product.images.find((image) => !image.isHoverImage) ?? product.images[0]!;
  const hoverImage = product.images.find((image) => image.isHoverImage) ?? null;
  const uniqueColors = new Set(product.variants.map((variant) => variant.colorName));

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
    averageRating: product.averageRating,
    reviewCount: product.reviewCount,
  };
}
