import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/client';
import type { AdminProductDetail, AdminProductListItem, PaginatedResult } from '@asn/types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

const detailInclude = {
  images: { orderBy: { position: Prisma.SortOrder.asc } },
  variants: { orderBy: [{ colorName: Prisma.SortOrder.asc }, { size: Prisma.SortOrder.asc }] },
} satisfies Prisma.ProductInclude;

type ProductWithDetail = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

function toAdminProductDetail(row: ProductWithDetail): AdminProductDetail {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    materials: row.materials,
    technologies: row.technologies,
    gender: row.gender,
    priceInCents: row.priceInCents,
    compareAtPriceInCents: row.compareAtPriceInCents,
    brandId: row.brandId,
    categoryId: row.categoryId,
    collectionId: row.collectionId,
    isPublished: row.isPublished,
    images: row.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      width: image.width,
      height: image.height,
      position: image.position,
    })),
    variants: row.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      stockQuantity: variant.stockQuantity,
      priceOverrideInCents: variant.priceOverrideInCents,
    })),
  };
}

/** "Tênis Marrow — Édição" -> "tenis-marrow-edicao". `\p{Diacritic}` (não uma faixa `̀-ͯ` escrita à mão) pra não depender de digitar caractere combinante literal num regex. */
function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'produto';
}

function skuFor(productSlug: string, colorName: string, size: string): string {
  return `${productSlug}-${slugify(colorName)}-${slugify(size)}`;
}

/** Mesma identidade da constraint `@@unique([productId, size, colorName])` do schema. */
function variantKey(variant: { colorName: string; size: string }): string {
  return `${variant.colorName}\u0000${variant.size}`;
}

@Injectable()
export class AdminProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PaginatedResult<AdminProductListItem>> {
    const where: Prisma.ProductWhereInput = params.q
      ? { name: { contains: params.q, mode: 'insensitive' } }
      : {};

    const [totalItems, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true } },
          images: { orderBy: { position: 'asc' }, take: 1 },
          variants: { select: { stockQuantity: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);

    return {
      items: products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        brandName: product.brand.name,
        categoryName: product.category.name,
        priceInCents: product.priceInCents,
        isPublished: product.isPublished,
        primaryImageUrl: product.images[0]?.url ?? null,
        totalStock: product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0),
      })),
      page: params.page,
      pageSize: params.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / params.pageSize)),
    };
  }

  async findById(id: string): Promise<AdminProductDetail | null> {
    const product = await this.prisma.product.findUnique({ where: { id }, include: detailInclude });
    return product ? toAdminProductDetail(product) : null;
  }

  /** Slug gerado do nome; em colisão, sufixa `-2`, `-3`... até achar um livre — nunca deixa a criação falhar por causa disso. */
  private async uniqueSlugFor(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  async create(dto: CreateProductDto): Promise<AdminProductDetail> {
    const slug = await this.uniqueSlugFor(dto.name);
    const product = await this.prisma.product.create({
      data: {
        slug,
        name: dto.name,
        description: dto.description,
        materials: dto.materials ?? [],
        technologies: dto.technologies ?? [],
        gender: dto.gender,
        priceInCents: dto.priceInCents,
        compareAtPriceInCents: dto.compareAtPriceInCents ?? null,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
        collectionId: dto.collectionId ?? null,
        isPublished: dto.isPublished,
        publishedAt: dto.isPublished ? new Date() : null,
        images: { create: dto.images },
        variants: {
          create: dto.variants.map((variant) => ({
            ...variant,
            sku: skuFor(slug, variant.colorName, variant.size),
          })),
        },
      },
      include: detailInclude,
    });
    return toAdminProductDetail(product);
  }

  /**
   * `images`, quando presente no PATCH, substitui a coleção inteira
   * (delete-all + recreate) — nada aponta pra uma imagem por ID.
   *
   * `variants` NÃO: variantes são referenciadas por carrinhos e pedidos,
   * então recriar todas a cada salvamento trocava os IDs — todo carrinho
   * aberto com aquele produto quebrava ("itens não existem mais") só
   * porque o admin corrigiu um preço. O formulário sempre manda o array
   * completo; aqui ele é casado com o existente por cor + tamanho (a
   * mesma chave única do banco): o que continua é atualizado mantendo o
   * ID, o que é novo é criado, o que saiu é excluído.
   *
   * `undefined` (campo omitido do PATCH) não mexe na coleção existente.
   */
  async update(id: string, dto: UpdateProductDto): Promise<AdminProductDetail> {
    const current = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      select: { slug: true, isPublished: true },
    });
    const willBePublished = dto.isPublished ?? current.isPublished;

    const product = await this.prisma.$transaction(async (tx) => {
      if (dto.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
      }
      if (dto.variants) {
        const existing = await tx.productVariant.findMany({
          where: { productId: id },
          select: { id: true, size: true, colorName: true },
        });
        const existingIdByKey = new Map(existing.map((v) => [variantKey(v), v.id]));
        const incomingKeys = new Set(dto.variants.map(variantKey));

        // Exclusões primeiro: libera o `sku` (único no banco) caso uma
        // variante removida e uma nova gerem o mesmo código.
        const removedIds = existing
          .filter((v) => !incomingKeys.has(variantKey(v)))
          .map((v) => v.id);
        if (removedIds.length > 0) {
          await tx.productVariant.deleteMany({ where: { id: { in: removedIds } } });
        }

        for (const variant of dto.variants) {
          const existingId = existingIdByKey.get(variantKey(variant));
          if (existingId) {
            await tx.productVariant.update({
              where: { id: existingId },
              data: {
                colorHex: variant.colorHex,
                stockQuantity: variant.stockQuantity,
                priceOverrideInCents: variant.priceOverrideInCents ?? null,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                ...variant,
                productId: id,
                sku: skuFor(current.slug, variant.colorName, variant.size),
              },
            });
          }
        }
      }
      return tx.product.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          materials: dto.materials,
          technologies: dto.technologies,
          gender: dto.gender,
          priceInCents: dto.priceInCents,
          compareAtPriceInCents: dto.compareAtPriceInCents,
          brandId: dto.brandId,
          categoryId: dto.categoryId,
          collectionId: dto.collectionId,
          isPublished: dto.isPublished,
          // Só marca `publishedAt` na TRANSIÇÃO rascunho -> publicado (não
          // sobrescreve a cada edição de um produto já publicado).
          publishedAt: !current.isPublished && willBePublished ? new Date() : undefined,
          images: dto.images ? { create: dto.images } : undefined,
        },
        include: detailInclude,
      });
    });
    return toAdminProductDetail(product);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }
}
