import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { ProductGender, ProductSortOption } from '@asn/types';

const GENDERS: ProductGender[] = ['MASCULINO', 'FEMININO', 'UNISSEX', 'INFANTIL'];
const SORT_OPTIONS: ProductSortOption[] = [
  'RELEVANCE',
  'NEWEST',
  'PRICE_ASC',
  'PRICE_DESC',
  'BEST_SELLING',
  'TOP_RATED',
];

/** `?brandSlugs=a,b,c` → `['a', 'b', 'c']`. Mantém a URL de filtros curta e legível. */
function toArray({ value }: { value: unknown }): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value as string[];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export class SearchProductsQueryDto {
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  brandSlugs?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  categorySlugs?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  collectionSlugs?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  colorNames?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(GENDERS, { each: true })
  genders?: ProductGender[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPriceInCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceInCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sort?: ProductSortOption;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  pageSize: number = 12;
}
