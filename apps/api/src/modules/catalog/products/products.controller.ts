import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import type { PaginatedResult, ProductDetail, ProductFacets, ProductSummary } from '@asn/types';
import { ProductsRepository } from './products.repository';
import { ListProductsQueryDto } from './dto/list-products.query.dto';
import { SearchProductsQueryDto } from './dto/search-products.query.dto';
import { ByIdsQueryDto } from './dto/by-ids.query.dto';
import { RelatedProductsQueryDto } from './dto/related-products.query.dto';

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

  /**
   * Busca em lote por ID — usado por "Vistos recentemente" (histórico
   * fica no localStorage do navegador, só os IDs; os dados vêm daqui).
   * Precisa vir antes de `:slug` para não ser interpretado como um slug.
   */
  @Get('by-ids')
  findByIds(@Query() query: ByIdsQueryDto): Promise<ProductSummary[]> {
    return this.repository.findByIds(query.ids);
  }

  /** Detalhe completo da PDP (Módulo 3). */
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string): Promise<ProductDetail> {
    const product = await this.repository.findBySlug(slug);
    if (!product) {
      throw new NotFoundException({
        errorCode: 'PRODUCT_NOT_FOUND',
        message: `Produto "${slug}" não encontrado.`,
      });
    }
    return product;
  }

  /** "Produtos relacionados" — mesma categoria, excluindo o próprio produto. */
  @Get(':slug/related')
  async findRelated(
    @Param('slug') slug: string,
    @Query() query: RelatedProductsQueryDto,
  ): Promise<ProductSummary[]> {
    const product = await this.repository.findIdAndCategoryBySlug(slug);
    if (!product) {
      throw new NotFoundException({
        errorCode: 'PRODUCT_NOT_FOUND',
        message: `Produto "${slug}" não encontrado.`,
      });
    }
    return this.repository.findRelated(product.id, product.categoryId, query.limit);
  }
}
