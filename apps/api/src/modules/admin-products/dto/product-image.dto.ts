import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class ProductImageDto {
  // String livre, não `@IsUrl` — o catálogo seed usa caminhos relativos
  // (`/seed-art/art-01.svg`, servidos por `apps/web/public`), não só URLs
  // absolutas de CDN. Cabe ao admin colar algo que resolva de verdade.
  @IsString()
  @MinLength(1)
  url!: string;

  @IsString()
  @MinLength(1)
  alt!: string;

  @IsInt()
  @Min(1)
  width!: number;

  @IsInt()
  @Min(1)
  height!: number;

  @IsInt()
  @Min(0)
  position!: number;
}
