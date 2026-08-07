import { Controller, Get, Query } from '@nestjs/common';
import type { Brand } from '@asn/types';
import { BrandsRepository } from './brands.repository';
import { ListBrandsQueryDto } from './dto/list-brands.query.dto';

@Controller({ path: 'brands', version: '1' })
export class BrandsController {
  constructor(private readonly repository: BrandsRepository) {}

  @Get()
  findAll(@Query() query: ListBrandsQueryDto): Promise<Brand[]> {
    return this.repository.findAll(query.limit);
  }
}
