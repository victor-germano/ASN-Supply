import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser, PaginatedResult, ProductQuestion } from '@asn/types';
import { QuestionsRepository } from './questions.repository';
import { ListQuestionsQueryDto } from './dto/list-questions.query.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

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

  /** Perguntar exige conta — `askerName` sempre vem do usuário autenticado, nunca de texto livre do body. */
  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuestionDto,
  ): Promise<ProductQuestion> {
    return this.repository.create(user.name, dto);
  }
}
