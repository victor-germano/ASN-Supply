import { Controller, Get, Query } from '@nestjs/common';
import type { ProductSummary } from '@asn/types';
import { ProductsRepository } from './products.repository';
import { ListProductsQueryDto } from './dto/list-products.query.dto';

@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly repository: ProductsRepository) {}

  @Get()
  findFeatured(@Query() query: ListProductsQueryDto): Promise<ProductSummary[]> {
    return this.repository.findFeatured(query.feature, query.limit);
  }
}
