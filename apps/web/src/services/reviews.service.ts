import type { PaginatedResult, ProductQuestion, Review, ReviewsSummary } from '@asn/types';
import { apiFetch } from './apiClient';

export function getReviewsSummary(productId: string): Promise<ReviewsSummary> {
  return apiFetch<ReviewsSummary>('/reviews/summary', {
    searchParams: { productId },
    revalidateSeconds: 120,
  });
}

export function getReviews(
  productId: string,
  params: { rating?: number; page: number; pageSize: number },
): Promise<PaginatedResult<Review>> {
  return apiFetch<PaginatedResult<Review>>('/reviews', {
    searchParams: {
      productId,
      rating: params.rating,
      page: params.page,
      pageSize: params.pageSize,
    },
    revalidateSeconds: 120,
  });
}

export function getQuestions(
  productId: string,
  params: { page: number; pageSize: number },
): Promise<PaginatedResult<ProductQuestion>> {
  return apiFetch<PaginatedResult<ProductQuestion>>('/questions', {
    searchParams: { productId, page: params.page, pageSize: params.pageSize },
    revalidateSeconds: 120,
  });
}
