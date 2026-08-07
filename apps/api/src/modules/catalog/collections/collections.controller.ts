import { Controller, Get, Query } from '@nestjs/common';
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
}
