import { Controller, Get, Query } from '@nestjs/common';
import type { PaginatedResult, ProductFacets, ProductSummary } from '@asn/types';
import { ProductsRepository } from './products.repository';
import { ListProductsQueryDto } from './dto/list-products.query.dto';
import { SearchProductsQueryDto } from './dto/search-products.query.dto';

@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly repository: ProductsRepository) {}

  /** Vitrine curta usada pela Home (Lançamentos/Mais Vendidos) — sem filtros nem paginação. */
  @Get()
  findFeatured(@Query() query: ListProductsQueryDto): Promise<ProductSummary[]> {
    return this.repository.findFeatured(query.feature, query.limit);
  }

  /** Listagem completa da PLP (Módulo 2): filtros + ordenação + paginação real. */
  @Get('search')
  search(@Query() query: SearchProductsQueryDto): Promise<PaginatedResult<ProductSummary>> {
    const { page, pageSize, ...filters } = query;
    return this.repository.search(filters, { page, pageSize });
  }

  /** Opções disponíveis para montar a UI de filtros da PLP. */
  @Get('facets')
  getFacets(): Promise<ProductFacets> {
    return this.repository.getFacets();
  }
}
