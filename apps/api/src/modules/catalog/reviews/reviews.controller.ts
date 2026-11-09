import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser, PaginatedResult, Review, ReviewsSummary } from '@asn/types';
import { ReviewsRepository } from './reviews.repository';
import { ListReviewsQueryDto } from './dto/list-reviews.query.dto';
import { ReviewSummaryQueryDto } from './dto/review-summary.query.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly repository: ReviewsRepository) {}

  @Get('summary')
  getSummary(@Query() query: ReviewSummaryQueryDto): Promise<ReviewsSummary> {
    return this.repository.getSummary(query.productId);
  }

  @Get()
  findByProduct(@Query() query: ListReviewsQueryDto): Promise<PaginatedResult<Review>> {
    return this.repository.findByProduct(query.productId, query.rating, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  /**
   * Avaliar exige conta (Área do Cliente) — `authorName` sempre vem do
   * usuário autenticado (`user.name`), nunca de texto livre do body: sem
   * isso, qualquer um poderia postar em nome de outra pessoa. Uma por
   * cliente por produto (ver `ReviewsRepository.create`).
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReviewDto): Promise<Review> {
    return this.repository.create(user.id, user.name, dto);
  }
}
