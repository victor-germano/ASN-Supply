import { IsHexColor, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class ProductVariantDto {
  @IsString()
  @MinLength(1)
  size!: string;

  @IsString()
  @MinLength(1)
  colorName!: string;

  @IsHexColor({ message: 'Cor deve ser um hexadecimal válido (ex: #16160F).' })
  colorHex!: string;

  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceOverrideInCents?: number;
}
