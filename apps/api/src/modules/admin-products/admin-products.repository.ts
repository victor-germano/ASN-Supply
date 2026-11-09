import { Injectable, NotFoundException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import type { AdminProductDetail, AdminProductListItem, PaginatedResult } from '@asn/types';
import { FirestoreService } from '../firestore/firestore.service';
import {
  AlgoliaService,
  type AlgoliaImageAsset,
  type AlgoliaProductRecord,
} from '../algolia/algolia.service';
import { globalVariantId } from '../../common/variant-id';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

interface BrandSnapshot {
  slug: string;
  name: string;
}

interface ProductDoc {
  name: string;
  description: string;
  materials: string[];
  technologies: string[];
  gender: string;
  priceInCents: number;
  compareAtPriceInCents: number | null;
  videoUrl: string | null;
  has360View: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isPublished: boolean;
  publishedAt: Timestamp | null;
  sizeGuideId: string | null;
  averageRating: number | null;
  reviewCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  brand: BrandSnapshot;
  category: BrandSnapshot;
  collection: BrandSnapshot | null;
}

interface ImageDoc {
  url: string;
  alt: string;
  width: number;
  height: number;
  position: number;
  isHoverImage: boolean;
  is360Frame: boolean;
}

interface VariantDoc {
  sku: string;
  size: string;
  colorName: string;
  colorHex: string;
  stockQuantity: number;
  priceOverrideInCents: number | null;
}

/** "Tênis Marrow — Édição" -> "tenis-marrow-edicao". */
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

function variantIdFor(colorName: string, size: string): string {
  return `${slugify(colorName)}_${slugify(size)}`;
}

@Injectable()
export class AdminProductsRepository {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly algolia: AlgoliaService,
  ) {}

  private products() {
    return this.firestore.db.collection('products');
  }

  async findAll(params: {
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PaginatedResult<AdminProductListItem>> {
    const snapshot = await this.products().get();
    const all = snapshot.docs
      .map((doc) => ({ slug: doc.id, data: doc.data() as ProductDoc }))
      .filter((entry) =>
        params.q ? entry.data.name.toLowerCase().includes(params.q.toLowerCase()) : true,
      )
      .sort((a, b) => b.data.createdAt.toMillis() - a.data.createdAt.toMillis());

    const totalItems = all.length;
    const pageSlice = all.slice(
      (params.page - 1) * params.pageSize,
      (params.page - 1) * params.pageSize + params.pageSize,
    );

    const items = await Promise.all(
      pageSlice.map(async (entry) => {
        const [imageSnap, variantsSnap] = await Promise.all([
          this.products()
            .doc(entry.slug)
            .collection('images')
            .orderBy('position', 'asc')
            .limit(1)
            .get(),
          this.products().doc(entry.slug).collection('variants').get(),
        ]);
        const primaryImage = imageSnap.docs[0]?.data() as ImageDoc | undefined;
        const totalStock = variantsSnap.docs.reduce(
          (sum, doc) => sum + (doc.data() as VariantDoc).stockQuantity,
          0,
        );
        return {
          id: entry.slug,
          slug: entry.slug,
          name: entry.data.name,
          brandName: entry.data.brand.name,
          categoryName: entry.data.category.name,
          priceInCents: entry.data.priceInCents,
          isPublished: entry.data.isPublished,
          primaryImageUrl: primaryImage?.url ?? null,
          totalStock,
        };
      }),
    );

    return {
      items,
      page: params.page,
      pageSize: params.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / params.pageSize)),
    };
  }

  async findById(id: string): Promise<AdminProductDetail | null> {
    const snap = await this.products().doc(id).get();
    if (!snap.exists) return null;
    return this.toAdminProductDetail(id, snap.data() as ProductDoc);
  }

  private async uniqueSlugFor(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;
    while ((await this.products().doc(candidate).get()).exists) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private async resolveSnapshot(collectionName: string, id: string): Promise<BrandSnapshot> {
    const snap = await this.firestore.db.collection(collectionName).doc(id).get();
    if (!snap.exists) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: `Referência inválida: "${id}" não existe em ${collectionName}.`,
      });
    }
    const data = snap.data() as { name: string };
    return { slug: id, name: data.name };
  }

  async create(dto: CreateProductDto): Promise<AdminProductDetail> {
    const slug = await this.uniqueSlugFor(dto.name);

    const [brand, category, collection] = await Promise.all([
      this.resolveSnapshot('brands', dto.brandId),
      this.resolveSnapshot('categories', dto.categoryId),
      dto.collectionId ? this.resolveSnapshot('collections', dto.collectionId) : null,
    ]);

    const now = Timestamp.now();
    const doc: ProductDoc = {
      name: dto.name,
      description: dto.description,
      materials: dto.materials ?? [],
      technologies: dto.technologies ?? [],
      gender: dto.gender,
      priceInCents: dto.priceInCents,
      compareAtPriceInCents: dto.compareAtPriceInCents ?? null,
      videoUrl: null,
      has360View: false,
      isNewArrival: false,
      isBestSeller: false,
      isPublished: dto.isPublished,
      publishedAt: dto.isPublished ? now : null,
      sizeGuideId: null,
      averageRating: null,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
      brand,
      category,
      collection,
    };

    const productRef = this.products().doc(slug);
    const batch = this.firestore.db.batch();
    batch.set(productRef, doc);
    for (const image of dto.images) {
      batch.set(productRef.collection('images').doc(), {
        url: image.url,
        alt: image.alt,
        width: image.width,
        height: image.height,
        position: image.position,
        isHoverImage: false,
        is360Frame: false,
      } satisfies ImageDoc);
    }
    for (const variant of dto.variants) {
      const variantDoc: VariantDoc = {
        sku: skuFor(slug, variant.colorName, variant.size),
        size: variant.size,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        stockQuantity: variant.stockQuantity,
        priceOverrideInCents: variant.priceOverrideInCents ?? null,
      };
      batch.set(
        productRef.collection('variants').doc(variantIdFor(variant.colorName, variant.size)),
        variantDoc,
      );
    }
    await batch.commit();

    const primaryImage = await this.resolvePrimaryImage(slug, dto.images);
    await this.syncAlgolia(slug, doc, primaryImage, dto.variants);

    return this.toAdminProductDetail(slug, doc);
  }

  /**
   * `images`, quando presente no PATCH, substitui a coleção inteira
   * (delete-all + recreate) — mesmo comportamento do Postgres.
   *
   * `variants` reconcilia por chave determinística (`colorSlug_sizeSlug`,
   * que já é o id do documento) — bem mais simples que o casamento manual
   * do Postgres, porque "preservar o id de quem continua" é automático: o
   * `set` na mesma chave sempre atualiza o mesmo documento. Só o que saiu
   * do payload recebido precisa de `delete` explícito.
   */
  async update(id: string, dto: UpdateProductDto): Promise<AdminProductDetail> {
    const currentSnap = await this.products().doc(id).get();
    if (!currentSnap.exists) {
      throw new NotFoundException({ errorCode: 'NOT_FOUND', message: 'Produto não encontrado.' });
    }
    const current = currentSnap.data() as ProductDoc;
    const willBePublished = dto.isPublished ?? current.isPublished;
    const productRef = this.products().doc(id);

    const [brand, category, collection] = await Promise.all([
      dto.brandId !== undefined ? this.resolveSnapshot('brands', dto.brandId) : null,
      dto.categoryId !== undefined ? this.resolveSnapshot('categories', dto.categoryId) : null,
      dto.collectionId !== undefined
        ? dto.collectionId
          ? this.resolveSnapshot('collections', dto.collectionId)
          : null
        : undefined,
    ]);

    const batch = this.firestore.db.batch();

    if (dto.images) {
      const existingImages = await productRef.collection('images').get();
      for (const doc of existingImages.docs) batch.delete(doc.ref);
      for (const image of dto.images) {
        batch.set(productRef.collection('images').doc(), {
          url: image.url,
          alt: image.alt,
          width: image.width,
          height: image.height,
          position: image.position,
          isHoverImage: false,
          is360Frame: false,
        } satisfies ImageDoc);
      }
    }

    if (dto.variants) {
      const existingVariants = await productRef.collection('variants').get();
      const incomingIds = new Set(
        dto.variants.map((variant) => variantIdFor(variant.colorName, variant.size)),
      );
      for (const doc of existingVariants.docs) {
        if (!incomingIds.has(doc.id)) batch.delete(doc.ref);
      }
      for (const variant of dto.variants) {
        const variantDoc: VariantDoc = {
          sku: skuFor(id, variant.colorName, variant.size),
          size: variant.size,
          colorName: variant.colorName,
          colorHex: variant.colorHex,
          stockQuantity: variant.stockQuantity,
          priceOverrideInCents: variant.priceOverrideInCents ?? null,
        };
        batch.set(
          productRef.collection('variants').doc(variantIdFor(variant.colorName, variant.size)),
          variantDoc,
        );
      }
    }

    const updated: ProductDoc = {
      ...current,
      name: dto.name ?? current.name,
      description: dto.description ?? current.description,
      materials: dto.materials ?? current.materials,
      technologies: dto.technologies ?? current.technologies,
      gender: dto.gender ?? current.gender,
      priceInCents: dto.priceInCents ?? current.priceInCents,
      compareAtPriceInCents:
        dto.compareAtPriceInCents !== undefined
          ? (dto.compareAtPriceInCents ?? null)
          : current.compareAtPriceInCents,
      brand: brand ?? current.brand,
      category: category ?? current.category,
      collection: collection !== undefined ? collection : current.collection,
      isPublished: dto.isPublished ?? current.isPublished,
      publishedAt: !current.isPublished && willBePublished ? Timestamp.now() : current.publishedAt,
      updatedAt: Timestamp.now(),
    };
    batch.set(productRef, updated);
    await batch.commit();

    const primaryImage = await this.resolvePrimaryImage(id, dto.images);
    const variantsForAlgolia = dto.variants ?? (await this.currentVariants(id));
    await this.syncAlgolia(id, updated, primaryImage, variantsForAlgolia);

    return this.toAdminProductDetail(id, updated);
  }

  async delete(id: string): Promise<void> {
    const productRef = this.products().doc(id);
    const snap = await productRef.get();
    if (!snap.exists) {
      throw new NotFoundException({ errorCode: 'NOT_FOUND', message: 'Produto não encontrado.' });
    }

    for (const sub of ['images', 'variants', 'lookItems', 'questions']) {
      await this.deleteAllDocs(productRef.collection(sub));
    }
    await productRef.delete();
    await this.algolia.deleteProduct(id);
  }

  private async deleteAllDocs(collectionRef: FirebaseFirestore.CollectionReference): Promise<void> {
    const snapshot = await collectionRef.get();
    if (snapshot.empty) return;
    const batch = this.firestore.db.batch();
    for (const doc of snapshot.docs) batch.delete(doc.ref);
    await batch.commit();
  }

  /**
   * Primeira imagem por posição — nenhuma delas pode ser marcada
   * `isHoverImage`/`is360Frame` pelo formulário atual (`ProductImageDto` não
   * tem esses campos, mesma limitação que já existia na criação via
   * Prisma), então "a imagem de capa pro Algolia" é sempre só a de menor
   * `position`, e `hoverImage` sempre `null` — consistente com o
   * comportamento atual do painel.
   */
  private async resolvePrimaryImage(
    productId: string,
    incomingImages: UpdateProductDto['images'],
  ): Promise<AlgoliaImageAsset> {
    if (incomingImages && incomingImages.length > 0) {
      const first = [...incomingImages].sort((a, b) => a.position - b.position)[0]!;
      return {
        id: `${productId}-img-${first.position}`,
        url: first.url,
        alt: first.alt,
        width: first.width,
        height: first.height,
        position: first.position,
      };
    }
    const snap = await this.products()
      .doc(productId)
      .collection('images')
      .orderBy('position', 'asc')
      .limit(1)
      .get();
    const doc = snap.docs[0];
    const data = doc?.data() as ImageDoc | undefined;
    return {
      id: doc?.id ?? `${productId}-img-0`,
      url: data?.url ?? '',
      alt: data?.alt ?? '',
      width: data?.width ?? 0,
      height: data?.height ?? 0,
      position: data?.position ?? 0,
    };
  }

  private async currentVariants(
    productId: string,
  ): Promise<{ colorName: string; size: string; colorHex: string; stockQuantity: number }[]> {
    const snap = await this.products().doc(productId).collection('variants').get();
    return snap.docs.map((doc) => {
      const data = doc.data() as VariantDoc;
      return {
        colorName: data.colorName,
        size: data.size,
        colorHex: data.colorHex,
        stockQuantity: data.stockQuantity,
      };
    });
  }

  private async syncAlgolia(
    slug: string,
    doc: ProductDoc,
    primaryImage: AlgoliaImageAsset,
    variants: { colorName: string; size: string; colorHex: string }[],
  ): Promise<void> {
    if (!doc.isPublished) {
      await this.algolia.deleteProduct(slug);
      return;
    }
    const colorNames = new Set<string>();
    const colorFacets = new Set<string>();
    const sizes = new Set<string>();
    for (const variant of variants) {
      colorNames.add(variant.colorName);
      colorFacets.add(`${variant.colorName}|${variant.colorHex}`);
      sizes.add(variant.size);
    }
    const record: AlgoliaProductRecord = {
      objectID: slug,
      name: doc.name,
      description: doc.description,
      brand: { id: doc.brand.slug, name: doc.brand.name, slug: doc.brand.slug },
      category: { id: doc.category.slug, name: doc.category.name, slug: doc.category.slug },
      collection: doc.collection
        ? { id: doc.collection.slug, name: doc.collection.name, slug: doc.collection.slug }
        : null,
      gender: doc.gender,
      priceInCents: doc.priceInCents,
      compareAtPriceInCents: doc.compareAtPriceInCents,
      primaryImage,
      hoverImage: null,
      availableColors: colorNames.size,
      isNewArrival: doc.isNewArrival,
      isBestSeller: doc.isBestSeller,
      averageRating: doc.averageRating,
      reviewCount: doc.reviewCount,
      colorNames: Array.from(colorNames),
      colorFacets: Array.from(colorFacets),
      sizes: Array.from(sizes),
      publishedAtMs: doc.publishedAt?.toMillis() ?? Date.now(),
    };
    await this.algolia.saveProduct(record);
  }

  private async toAdminProductDetail(id: string, doc: ProductDoc): Promise<AdminProductDetail> {
    const productRef = this.products().doc(id);
    const [imagesSnap, variantsSnap] = await Promise.all([
      productRef.collection('images').orderBy('position', 'asc').get(),
      productRef.collection('variants').get(),
    ]);

    return {
      id,
      slug: id,
      name: doc.name,
      description: doc.description,
      materials: doc.materials,
      technologies: doc.technologies,
      gender: doc.gender as AdminProductDetail['gender'],
      priceInCents: doc.priceInCents,
      compareAtPriceInCents: doc.compareAtPriceInCents,
      brandId: doc.brand.slug,
      categoryId: doc.category.slug,
      collectionId: doc.collection?.slug ?? null,
      isPublished: doc.isPublished,
      images: imagesSnap.docs.map((d) => {
        const data = d.data() as ImageDoc;
        return {
          id: d.id,
          url: data.url,
          alt: data.alt,
          width: data.width,
          height: data.height,
          position: data.position,
        };
      }),
      variants: variantsSnap.docs
        .map((d) => {
          const data = d.data() as VariantDoc;
          return {
            id: globalVariantId(id, d.id),
            sku: data.sku,
            size: data.size,
            colorName: data.colorName,
            colorHex: data.colorHex,
            stockQuantity: data.stockQuantity,
            priceOverrideInCents: data.priceOverrideInCents,
          };
        })
        .sort((a, b) => a.colorName.localeCompare(b.colorName) || a.size.localeCompare(b.size)),
    };
  }
}
