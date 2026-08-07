import { Controller, Get, Query } from '@nestjs/common';
import type { PaginatedResult, ProductQuestion } from '@asn/types';
import { QuestionsRepository } from './questions.repository';
import { ListQuestionsQueryDto } from './dto/list-questions.query.dto';

@Controller({ path: 'questions', version: '1' })
export class QuestionsController {
  constructor(private readonly repository: QuestionsRepository) {}

  @Get()
  findByProduct(@Query() query: ListQuestionsQueryDto): Promise<PaginatedResult<ProductQuestion>> {
    return this.repository.findByProduct(query.productId, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
