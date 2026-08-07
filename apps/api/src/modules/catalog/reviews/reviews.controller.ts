import { Controller, Get, Query } from '@nestjs/common';
import type { PaginatedResult, Review, ReviewsSummary } from '@asn/types';
import { ReviewsRepository } from './reviews.repository';
import { ListReviewsQueryDto } from './dto/list-reviews.query.dto';
import { ReviewSummaryQueryDto } from './dto/review-summary.query.dto';

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
}
