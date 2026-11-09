import { Injectable, Logger } from '@nestjs/common';
import type { Timestamp } from 'firebase-admin/firestore';
import type {
  LookItem,
  PaginatedResult,
  ProductDetail,
  ProductFacets,
  ProductFilters,
  ProductSummary,
} from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';
import { AlgoliaService, type AlgoliaProductRecord } from '../../algolia/algolia.service';
import { globalVariantId } from '../../../common/variant-id';
import type { ProductFeatureFilter } from './dto/list-products.query.dto';

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

interface LookItemDoc {
  platform: string;
  title: string;
  imageUrl: string;
  priceLabel: string;
  externalUrl: string;
  position: number;
}

/** Escapa aspas duplas — único caractere que quebraria a sintaxe de filtro do Algolia num valor vindo de slug/nome. */
function escapeFilterValue(value: string): string {
  return value.replace(/"/g, '\\"');
}

function orClause(attribute: string, values: string[]): string {
  return `(${values.map((value) => `${attribute}:"${escapeFilterValue(value)}"`).join(' OR ')})`;
}

@Injectable()
export class ProductsRepository {
  private readonly logger = new Logger(ProductsRepository.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly algolia: AlgoliaService,
  ) {}

  private products() {
    return this.firestore.db.collection('products');
  }

  async findFeatured(
    feature: ProductFeatureFilter | undefined,
    limit: number,
  ): Promise<ProductSummary[]> {
    // Filtro único de igualdade (`isPublished`) — não precisa de índice
    // composto porque não há `orderBy` de outro campo na própria consulta
    // (a ordenação por `publishedAt` acontece depois, em memória).
    const snapshot = await this.products().where('isPublished', '==', true).get();

    const candidates = snapshot.docs
      .map((doc) => ({ slug: doc.id, data: doc.data() as ProductDoc }))
      .filter((entry) => {
        if (feature === 'new-arrivals') return entry.data.isNewArrival;
        if (feature === 'best-sellers') return entry.data.isBestSeller;
        return true;
      })
      .sort((a, b) => (b.data.publishedAt?.toMillis() ?? 0) - (a.data.publishedAt?.toMillis() ?? 0))
      .slice(0, limit);

    const summaries = await Promise.all(
      candidates.map((entry) => this.toSummaryIfHasGallery(entry.slug, entry.data)),
    );
    return summaries.filter((summary): summary is ProductSummary => summary !== null);
  }

  /** Listagem completa da PLP: filtros + ordenação + paginação real — via Algolia. */
  async search(
    filters: ProductFilters,
    pagination: { page: number; pageSize: number },
  ): Promise<PaginatedResult<ProductSummary>> {
    const indexName = this.algolia.indexNameForSort(this.toAlgoliaSort(filters.sort));
    const response = await this.algolia.search<AlgoliaProductRecord>({
      indexName,
      query: filters.query?.trim() ?? '',
      filters: this.buildAlgoliaFilters(filters),
      page: pagination.page - 1,
      hitsPerPage: pagination.pageSize,
    });

    const totalItems = response.nbHits ?? 0;
    return {
      items: response.hits.map((hit) => this.hitToSummary(hit)),
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
      totalPages: Math.max(1, response.nbPages ?? Math.ceil(totalItems / pagination.pageSize)),
    };
  }

  /**
   * Opções disponíveis para montar os filtros da PLP. Calculadas sobre todo
   * o catálogo publicado (índice Algolia só contém produto publicado) — ver
   * nota em `ProductFacets` (@asn/types) sobre a limitação deliberada de não
   * re-estreitar por seleção atual.
   */
  async getFacets(): Promise<ProductFacets> {
    const response = await this.algolia.search<AlgoliaProductRecord>({
      indexName: this.algolia.indexName,
      query: '',
      hitsPerPage: 0,
      facets: ['brand.slug', 'category.slug', 'colorFacets', 'sizes', 'gender', 'priceInCents'],
    });

    const facets = (response as { facets?: Record<string, Record<string, number>> }).facets ?? {};
    const facetStats =
      (response as { facets_stats?: Record<string, { min?: number; max?: number }> })
        .facets_stats ?? {};

    const brandCounts = facets['brand.slug'] ?? {};
    const categoryCounts = facets['category.slug'] ?? {};
    const colorFacetCounts = facets['colorFacets'] ?? {};
    const sizeCounts = facets['sizes'] ?? {};
    const genderCounts = facets['gender'] ?? {};

    const [brandDocs, categoryDocs] = await Promise.all([
      this.resolveNames('brands', Object.keys(brandCounts)),
      this.resolveNames('categories', Object.keys(categoryCounts)),
    ]);

    const colorCounts = new Map<string, { hex: string; count: number }>();
    for (const [key, count] of Object.entries(colorFacetCounts)) {
      const [name, hex] = key.split('|');
      if (!name || !hex) continue;
      const existing = colorCounts.get(name);
      colorCounts.set(name, { hex, count: (existing?.count ?? 0) + count });
    }

    return {
      brands: Object.entries(brandCounts)
        .map(([slug, count]) => ({ slug, label: brandDocs.get(slug) ?? slug, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      categories: Object.entries(categoryCounts)
        .map(([slug, count]) => ({ slug, label: categoryDocs.get(slug) ?? slug, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      colors: Array.from(colorCounts.entries())
        .map(([name, { hex, count }]) => ({ name, hex, count }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      sizes: Object.entries(sizeCounts)
        .map(([size, count]) => ({ size, count }))
        .sort((a, b) => Number(a.size) - Number(b.size)),
      genders: Object.entries(genderCounts).map(([value, count]) => ({
        value: value as ProductFacets['genders'][number]['value'],
        count,
      })),
      priceRange: {
        minInCents: Math.round(facetStats['priceInCents']?.min ?? 0),
        maxInCents: Math.round(facetStats['priceInCents']?.max ?? 0),
      },
    };
  }

  /**
   * Detalhe completo para a PDP — `null` se não existir, não estiver
   * publicado, ou (mesma falha de conteúdo tratada em `toSummaryIfHasGallery`)
   * não tiver nenhuma imagem de galeria além dos frames do giro 360°.
   */
  async findBySlug(slug: string): Promise<ProductDetail | null> {
    const snap = await this.products().doc(slug).get();
    if (!snap.exists) return null;
    const data = snap.data() as ProductDoc;
    if (!data.isPublished) return null;

    const productRef = this.products().doc(slug);
    const [imagesSnap, variantsSnap] = await Promise.all([
      productRef.collection('images').orderBy('position', 'asc').get(),
      productRef.collection('variants').get(),
    ]);
    const images = imagesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as ImageDoc) }));
    if (images.every((image) => image.is360Frame)) {
      this.logger.warn(
        `Produto ${slug} publicado sem imagens de galeria — tratado como não encontrado.`,
      );
      return null;
    }

    return toProductDetail(slug, data, images, variantsSnap.docs);
  }

  /**
   * Lookup mínimo (id + categoria) pra resolver um slug sem pagar o custo
   * das subcoleções inteiras — `id`/`categoryId` aqui já são slugs.
   */
  async findIdAndCategoryBySlug(slug: string): Promise<{ id: string; categoryId: string } | null> {
    const snap = await this.products().doc(slug).get();
    if (!snap.exists) return null;
    const data = snap.data() as ProductDoc;
    if (!data.isPublished) return null;
    return { id: slug, categoryId: data.category.slug };
  }

  /** Mesma categoria, excluindo o próprio produto — usado em "Produtos relacionados". */
  async findRelated(
    productId: string,
    categoryId: string,
    limit: number,
  ): Promise<ProductSummary[]> {
    const snapshot = await this.products().where('category.slug', '==', categoryId).get();
    const candidates = snapshot.docs
      .map((doc) => ({ slug: doc.id, data: doc.data() as ProductDoc }))
      .filter((entry) => entry.data.isPublished && entry.slug !== productId)
      .sort((a, b) => (b.data.publishedAt?.toMillis() ?? 0) - (a.data.publishedAt?.toMillis() ?? 0))
      .slice(0, limit);

    const summaries = await Promise.all(
      candidates.map((entry) => this.toSummaryIfHasGallery(entry.slug, entry.data)),
    );
    return summaries.filter((summary): summary is ProductSummary => summary !== null);
  }

  /** "Complete o look" (Provador Digital) — itens curados manualmente, na ordem de curadoria. */
  async findLookItems(productId: string): Promise<LookItem[]> {
    const snapshot = await this.products()
      .doc(productId)
      .collection('lookItems')
      .orderBy('position', 'asc')
      .get();
    return snapshot.docs.map((doc) => {
      const data = doc.data() as LookItemDoc;
      return {
        id: doc.id,
        platform: data.platform,
        title: data.title,
        imageUrl: data.imageUrl,
        priceLabel: data.priceLabel,
        externalUrl: data.externalUrl,
      };
    });
  }

  /** Busca em lote por ID, preservando a ordem recebida — usado em "Vistos recentemente". */
  async findByIds(ids: string[]): Promise<ProductSummary[]> {
    if (ids.length === 0) return [];

    const docs = await Promise.all(ids.map((id) => this.products().doc(id).get()));
    const summaries = await Promise.all(
      docs.map(async (snap) => {
        if (!snap.exists) return null;
        const data = snap.data() as ProductDoc;
        if (!data.isPublished) return null;
        return this.toSummaryIfHasGallery(snap.id, data);
      }),
    );
    return summaries.filter((summary): summary is ProductSummary => summary !== null);
  }

  /** Resumo enxuto de todo o catálogo publicado — só pro prompt da busca por IA, nunca exposto direto numa resposta HTTP. */
  async findCatalogSummaryForAi(): Promise<
    {
      id: string;
      name: string;
      brandName: string;
      categoryName: string;
      description: string;
      materials: string[];
      technologies: string[];
    }[]
  > {
    const snapshot = await this.products().where('isPublished', '==', true).get();
    return snapshot.docs.map((doc) => {
      const data = doc.data() as ProductDoc;
      return {
        id: doc.id,
        name: data.name,
        brandName: data.brand.name,
        categoryName: data.category.name,
        description: data.description,
        materials: data.materials,
        technologies: data.technologies,
      };
    });
  }

  private toAlgoliaSort(sort: ProductFilters['sort']) {
    switch (sort) {
      case 'PRICE_ASC':
        return 'PRICE_ASC' as const;
      case 'PRICE_DESC':
        return 'PRICE_DESC' as const;
      case 'BEST_SELLING':
        return 'BEST_SELLING' as const;
      case 'TOP_RATED':
        return 'TOP_RATED' as const;
      case 'NEWEST':
      case 'RELEVANCE':
      default:
        // RELEVANCE sem mecanismo de full-text ranking próprio (fora de
        // escopo) cai pra "mais recente primeiro" — mesma regra que já
        // existia na versão Postgres.
        return 'NEWEST' as const;
    }
  }

  private buildAlgoliaFilters(filters: ProductFilters): string | undefined {
    const clauses: string[] = [];
    if (filters.brandSlugs?.length) clauses.push(orClause('brand.slug', filters.brandSlugs));
    if (filters.categorySlugs?.length)
      clauses.push(orClause('category.slug', filters.categorySlugs));
    if (filters.collectionSlugs?.length) {
      clauses.push(orClause('collection.slug', filters.collectionSlugs));
    }
    if (filters.genders?.length) clauses.push(orClause('gender', filters.genders));
    if (filters.colorNames?.length) clauses.push(orClause('colorNames', filters.colorNames));
    if (filters.sizes?.length) clauses.push(orClause('sizes', filters.sizes));
    if (filters.minPriceInCents !== undefined) {
      clauses.push(`priceInCents >= ${filters.minPriceInCents}`);
    }
    if (filters.maxPriceInCents !== undefined) {
      clauses.push(`priceInCents <= ${filters.maxPriceInCents}`);
    }
    return clauses.length > 0 ? clauses.join(' AND ') : undefined;
  }

  private hitToSummary(hit: AlgoliaProductRecord & { objectID: string }): ProductSummary {
    return {
      id: hit.objectID,
      slug: hit.objectID,
      name: hit.name,
      brand: hit.brand,
      category: hit.category,
      price: { amountInCents: hit.priceInCents, currency: 'BRL' },
      compareAtPrice:
        hit.compareAtPriceInCents !== null
          ? { amountInCents: hit.compareAtPriceInCents, currency: 'BRL' }
          : null,
      primaryImage: hit.primaryImage,
      hoverImage: hit.hoverImage,
      availableColors: hit.availableColors,
      isNewArrival: hit.isNewArrival,
      averageRating: hit.averageRating,
      reviewCount: hit.reviewCount,
    };
  }

  private async resolveNames(collectionName: string, ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const docs = await Promise.all(
      ids.map((id) => this.firestore.db.collection(collectionName).doc(id).get()),
    );
    const map = new Map<string, string>();
    for (const doc of docs) {
      if (doc.exists) map.set(doc.id, (doc.data() as { name: string }).name);
    }
    return map;
  }

  /** Produto publicado sem imagem de galeria é falha de conteúdo — omitido (com log), não quebra a listagem inteira. */
  private async toSummaryIfHasGallery(
    slug: string,
    data: ProductDoc,
  ): Promise<ProductSummary | null> {
    const productRef = this.products().doc(slug);
    const [imagesSnap, variantsSnap] = await Promise.all([
      productRef.collection('images').orderBy('position', 'asc').get(),
      productRef.collection('variants').get(),
    ]);
    const images = imagesSnap.docs.map((d) => d.data() as ImageDoc);
    const galleryImages = images.filter((image) => !image.is360Frame);
    if (galleryImages.length === 0) {
      this.logger.warn(`Produto ${slug} publicado sem imagens de galeria — omitido da vitrine.`);
      return null;
    }
    return toProductSummary(slug, data, imagesSnap.docs, variantsSnap.docs);
  }
}

function toImageAsset(id: string, image: ImageDoc) {
  return {
    id,
    url: image.url,
    alt: image.alt,
    width: image.width,
    height: image.height,
    position: image.position,
  };
}

function toProductSummary(
  slug: string,
  data: ProductDoc,
  imageDocs: FirebaseFirestore.QueryDocumentSnapshot[],
  variantDocs: FirebaseFirestore.QueryDocumentSnapshot[],
): ProductSummary {
  const images = imageDocs.map((doc) => ({ id: doc.id, ...(doc.data() as ImageDoc) }));
  const galleryImages = images.filter((image) => !image.is360Frame);
  const primaryImage = galleryImages.find((image) => !image.isHoverImage) ?? galleryImages[0]!;
  const hoverImage = galleryImages.find((image) => image.isHoverImage) ?? null;
  const uniqueColors = new Set(variantDocs.map((doc) => (doc.data() as VariantDoc).colorName));

  return {
    id: slug,
    slug,
    name: data.name,
    brand: { id: data.brand.slug, name: data.brand.name, slug: data.brand.slug },
    category: { id: data.category.slug, name: data.category.name, slug: data.category.slug },
    price: { amountInCents: data.priceInCents, currency: 'BRL' },
    compareAtPrice:
      data.compareAtPriceInCents !== null
        ? { amountInCents: data.compareAtPriceInCents, currency: 'BRL' }
        : null,
    primaryImage: toImageAsset(primaryImage.id, primaryImage),
    hoverImage: hoverImage && toImageAsset(hoverImage.id, hoverImage),
    availableColors: uniqueColors.size,
    isNewArrival: data.isNewArrival,
    averageRating: data.averageRating,
    reviewCount: data.reviewCount,
  };
}

function toProductDetail(
  slug: string,
  data: ProductDoc,
  images: {
    id: string;
    url: string;
    alt: string;
    width: number;
    height: number;
    position: number;
    isHoverImage: boolean;
    is360Frame: boolean;
  }[],
  variantDocs: FirebaseFirestore.QueryDocumentSnapshot[],
): ProductDetail {
  const galleryImages = images.filter((image) => !image.is360Frame);
  const frames360 = images.filter((image) => image.is360Frame);
  const primaryImage = galleryImages.find((image) => !image.isHoverImage) ?? galleryImages[0]!;
  const hoverImage = galleryImages.find((image) => image.isHoverImage) ?? null;
  const variants = variantDocs
    .map((doc) => ({ id: doc.id, ...(doc.data() as VariantDoc) }))
    .sort((a, b) => a.colorName.localeCompare(b.colorName) || a.size.localeCompare(b.size));
  const uniqueColors = new Set(variants.map((variant) => variant.colorName));

  return {
    id: slug,
    slug,
    name: data.name,
    brand: { id: data.brand.slug, name: data.brand.name, slug: data.brand.slug },
    category: { id: data.category.slug, name: data.category.name, slug: data.category.slug },
    price: { amountInCents: data.priceInCents, currency: 'BRL' },
    compareAtPrice:
      data.compareAtPriceInCents !== null
        ? { amountInCents: data.compareAtPriceInCents, currency: 'BRL' }
        : null,
    primaryImage: toImageAsset(primaryImage.id, primaryImage),
    hoverImage: hoverImage && toImageAsset(hoverImage.id, hoverImage),
    availableColors: uniqueColors.size,
    isNewArrival: data.isNewArrival,
    averageRating: data.averageRating,
    reviewCount: data.reviewCount,
    description: data.description,
    materials: data.materials,
    technologies: data.technologies,
    gender: data.gender as ProductDetail['gender'],
    images: galleryImages.map((image) => toImageAsset(image.id, image)),
    videoUrl: data.videoUrl,
    has360View: data.has360View,
    frames360: frames360.map((image) => toImageAsset(image.id, image)),
    variants: variants.map((variant) => ({
      id: globalVariantId(slug, variant.id),
      sku: variant.sku,
      size: variant.size,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      stockQuantity: variant.stockQuantity,
      priceOverride:
        variant.priceOverrideInCents !== null
          ? { amountInCents: variant.priceOverrideInCents, currency: 'BRL' }
          : null,
    })),
    sizeGuideId: data.sizeGuideId,
    collection: data.collection
      ? { id: data.collection.slug, name: data.collection.name, slug: data.collection.slug }
      : null,
  };
}
