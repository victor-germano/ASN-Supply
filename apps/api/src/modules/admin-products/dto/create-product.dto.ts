import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { ProductGender } from '@asn/types';
import { ProductImageDto } from './product-image.dto';
import { ProductVariantDto } from './product-variant.dto';

const GENDERS: ProductGender[] = ['MASCULINO', 'FEMININO', 'UNISSEX', 'INFANTIL'];

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @IsIn(GENDERS)
  gender!: ProductGender;

  @IsInt()
  @Min(1)
  priceInCents!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  compareAtPriceInCents?: number;

  @IsString()
  brandId!: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  collectionId?: string;

  @IsBoolean()
  isPublished!: boolean;

  @IsArray()
  @ArrayMinSize(1, { message: 'Cadastre ao menos uma imagem.' })
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images!: ProductImageDto[];

  @IsArray()
  @ArrayMinSize(1, { message: 'Cadastre ao menos uma variante (tamanho/cor).' })
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants!: ProductVariantDto[];
}
