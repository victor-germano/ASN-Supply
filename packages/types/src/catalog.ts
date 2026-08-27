import type { ImageAsset, Money } from './common';

/** Imagem de capa leve (sem dimensões) — usada onde o container já define um aspect-ratio fixo via CSS. */
export interface CoverImage {
  url: string;
  alt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  image: CoverImage | null;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: CoverImage | null;
  /** Data de lançamento — usada para ordenar "Lançamentos" na Home. */
  launchedAt: string | null;
}

export type ProductGender = 'MASCULINO' | 'FEMININO' | 'UNISSEX' | 'INFANTIL';

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  colorName: string;
  colorHex: string;
  stockQuantity: number;
  priceOverride: Money | null;
}

/** Representação enxuta usada em grids/listagens (Home, PLP, relacionados). */
export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  brand: Pick<Brand, 'id' | 'name' | 'slug'>;
  category: Pick<Category, 'id' | 'name' | 'slug'>;
  price: Money;
  compareAtPrice: Money | null;
  primaryImage: ImageAsset;
  hoverImage: ImageAsset | null;
  availableColors: number;
  isNewArrival: boolean;
  averageRating: number | null;
  reviewCount: number;
}

/** Representação completa usada na página do produto (PDP). */
export interface ProductDetail extends ProductSummary {
  description: string;
  materials: string[];
  technologies: string[];
  gender: ProductGender;
  images: ImageAsset[];
  videoUrl: string | null;
  has360View: boolean;
  /** Sequência de quadros do giro 360° — vazio quando `has360View` é falso. */
  frames360: ImageAsset[];
  variants: ProductVariant[];
  sizeGuideId: string | null;
  collection: Pick<Collection, 'id' | 'name' | 'slug'> | null;
}

export type ProductSortOption =
  'RELEVANCE' | 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC' | 'BEST_SELLING' | 'TOP_RATED';

export interface ProductFilters {
  /** Slugs, não IDs de banco — URL amigável e estável entre reseeds do catálogo. */
  brandSlugs?: string[];
  categorySlugs?: string[];
  collectionSlugs?: string[];
  colorNames?: string[];
  sizes?: string[];
  minPriceInCents?: number;
  maxPriceInCents?: number;
  genders?: ProductGender[];
  query?: string;
  sort?: ProductSortOption;
}

export interface ProductFacetOption {
  slug: string;
  label: string;
  count: number;
}

export interface ProductColorFacetOption {
  name: string;
  hex: string;
  count: number;
}

export interface ProductGenderFacetOption {
  value: ProductGender;
  count: number;
}

/**
 * Opções disponíveis para montar a UI de filtros da listagem (Módulo 2).
 * Calculadas sobre todo o catálogo publicado — não são re-narrowed
 * dinamicamente pela seleção atual de filtros (faceted search completo é
 * uma evolução possível, não implementada nesta fase).
 */
export interface ProductFacets {
  brands: ProductFacetOption[];
  categories: ProductFacetOption[];
  colors: ProductColorFacetOption[];
  sizes: { size: string; count: number }[];
  genders: ProductGenderFacetOption[];
  priceRange: { minInCents: number; maxInCents: number };
}

/**
 * "Complete o look" — peça de outra loja curada manualmente para combinar
 * com o produto (ver comentário do model `LookItem` no schema Prisma para o
 * porquê de ser curadoria manual, não integração ao vivo com marketplaces).
 * `priceLabel` é texto livre ("R$ 89,90"), não um valor rastreado — preço
 * exibido é só o de quando foi cadastrado, sempre conferido na loja de
 * destino antes de comprar.
 */
export interface LookItem {
  id: string;
  platform: string;
  title: string;
  imageUrl: string;
  priceLabel: string;
  externalUrl: string;
}
