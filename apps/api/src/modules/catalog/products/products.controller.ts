import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type {
  AiSearchResult,
  LookItem,
  PaginatedResult,
  ProductDetail,
  ProductFacets,
  ProductSummary,
} from '@asn/types';
import { ProductsRepository } from './products.repository';
import { AiSearchService } from './ai-search.service';
import { ListProductsQueryDto } from './dto/list-products.query.dto';
import { SearchProductsQueryDto } from './dto/search-products.query.dto';
import { ByIdsQueryDto } from './dto/by-ids.query.dto';
import { RelatedProductsQueryDto } from './dto/related-products.query.dto';
import { AiSearchDto } from './dto/ai-search.dto';

@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(
    private readonly repository: ProductsRepository,
    private readonly aiSearchService: AiSearchService,
  ) {}

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
   * "Busca por IA" (Módulo 8) — POST (não GET) porque manda o catálogo
   * inteiro num prompt do lado do servidor a cada chamada (custo real de
   * IA), então throttle mais restrito que uma busca textual comum.
   */
  @Post('ai-search')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  aiSearch(@Body() dto: AiSearchDto): Promise<AiSearchResult> {
    return this.aiSearchService.search(dto.query);
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

  /**
   * "Complete o look" (Provador Digital) — peças curadas manualmente de
   * outras lojas. Lista vazia é o caso normal (nem todo produto tem
   * curadoria ainda), não um erro — só o slug em si precisa existir.
   */
  @Get(':slug/look-items')
  async findLookItems(@Param('slug') slug: string): Promise<LookItem[]> {
    const product = await this.repository.findIdAndCategoryBySlug(slug);
    if (!product) {
      throw new NotFoundException({
        errorCode: 'PRODUCT_NOT_FOUND',
        message: `Produto "${slug}" não encontrado.`,
      });
    }
    return this.repository.findLookItems(product.id);
  }
}
