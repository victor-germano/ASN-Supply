import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import type { Collection } from '@asn/types';
import { CollectionsRepository } from './collections.repository';
import { ListCollectionsQueryDto } from './dto/list-collections.query.dto';

@Controller({ path: 'collections', version: '1' })
export class CollectionsController {
  constructor(private readonly repository: CollectionsRepository) {}

  @Get()
  findLaunched(@Query() query: ListCollectionsQueryDto): Promise<Collection[]> {
    return this.repository.findLaunched(query.limit);
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string): Promise<Collection> {
    const collection = await this.repository.findBySlug(slug);
    if (!collection) {
      throw new NotFoundException({
        errorCode: 'COLLECTION_NOT_FOUND',
        message: `Coleção "${slug}" não encontrada.`,
      });
    }
    return collection;
  }
}
