import { Controller, Get } from '@nestjs/common';
import type { Category } from '@asn/types';
import { CategoriesRepository } from './categories.repository';

@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly repository: CategoriesRepository) {}

  @Get()
  findTopLevel(): Promise<Category[]> {
    return this.repository.findTopLevel();
  }
}
