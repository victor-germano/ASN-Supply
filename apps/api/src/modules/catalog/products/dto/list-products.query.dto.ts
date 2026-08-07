import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export type ProductFeatureFilter = 'new-arrivals' | 'best-sellers';

/**
 * Query params suportados pela listagem "vitrine" (usada pela Home). A
 * listagem completa com filtros de marca/preço/cor/tamanho (PLP) é um
 * contrato à parte, implementado no Módulo 2, para não sobrecarregar este
 * endpoint com responsabilidades que ainda não existem.
 */
export class ListProductsQueryDto {
  @IsOptional()
  @IsIn(['new-arrivals', 'best-sellers'])
  feature?: ProductFeatureFilter;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  limit: number = 8;
}
