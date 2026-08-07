import type { ImageAsset, Money } from './common';

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
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: ImageAsset | null;
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
  variants: ProductVariant[];
  sizeGuideId: string | null;
  collection: Pick<Collection, 'id' | 'name' | 'slug'> | null;
}

export type ProductSortOption =
  'RELEVANCE' | 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC' | 'BEST_SELLING' | 'TOP_RATED';

export interface ProductFilters {
  brandIds?: string[];
  categoryIds?: string[];
  colorNames?: string[];
  sizes?: string[];
  minPriceInCents?: number;
  maxPriceInCents?: number;
  genders?: ProductGender[];
  query?: string;
  sort?: ProductSortOption;
}
