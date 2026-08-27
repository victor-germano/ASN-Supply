import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  // String livre, não `@IsUrl` — mesmo motivo de `ProductImageDto`: o
  // catálogo seed usa caminhos relativos servidos por `apps/web/public`,
  // não só URLs absolutas de CDN.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  logoUrl?: string;
}
