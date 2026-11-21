import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBannerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  ctaLabel!: string;

  @IsString()
  @MaxLength(500)
  ctaHref!: string;

  // String livre, não `@IsUrl` — mesmo motivo de `ProductImageDto`: o
  // upload da Cloudinary já devolve uma URL absoluta, mas o admin também
  // pode colar um caminho relativo servido por `apps/web/public`.
  @IsString()
  @MaxLength(2000)
  imageUrlDesktop!: string;

  @IsString()
  @MaxLength(2000)
  imageUrlMobile!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;
}
