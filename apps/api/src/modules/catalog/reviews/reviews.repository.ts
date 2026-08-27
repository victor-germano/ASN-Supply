import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResult, RatingDistributionEntry, Review, ReviewsSummary } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateReviewDto } from './dto/create-review.dto';

const ALL_RATINGS = [5, 4, 3, 2, 1] as const;

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(
    productId: string,
    rating: number | undefined,
    pagination: { page: number; pageSize: number },
  ): Promise<PaginatedResult<Review>> {
    const where = { productId, ...(rating !== undefined && { rating }) };

    const [totalItems, reviews] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: { user: { select: { name: true } } },
        // Mais úteis primeiro, depois mais recentes — reflete o que a
        // maioria das lojas mostra por padrão na aba de avaliações.
        orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
    ]);

    return {
      items: reviews.map((review) => ({
        id: review.id,
        productId: review.productId,
        authorName: review.user.name,
        rating: review.rating as Review['rating'],
        title: review.title,
        comment: review.comment,
        imageUrls: review.imageUrls,
        videoUrls: review.videoUrls,
        isVerifiedPurchase: review.isVerifiedPurchase,
        helpfulCount: review.helpfulCount,
        createdAt: review.createdAt.toISOString(),
      })),
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pagination.pageSize)),
    };
  }

  /**
   * Uma avaliação por cliente por produto — segunda tentativa vira 409, não
   * substitui a existente (evita nota inflada/duplicada pelo mesmo cliente).
   * `isVerifiedPurchase` é calculado aqui, nunca aceito do client: verdade
   * só se existir algum `OrderItem` deste produto num pedido deste usuário.
   * `averageRating`/`reviewCount` em `Product` são recalculados na mesma
   * transação da criação — é o "recalculado a cada review criada/removida"
   * que o comentário do campo no schema já previa.
   */
  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException({
        errorCode: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado.',
      });
    }

    const existing = await this.prisma.review.findFirst({
      where: { productId: dto.productId, userId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        errorCode: 'REVIEW_ALREADY_EXISTS',
        message: 'Você já avaliou este produto.',
      });
    }

    const purchaseCount = await this.prisma.orderItem.count({
      where: { productId: dto.productId, order: { userId } },
    });

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          productId: dto.productId,
          userId,
          rating: dto.rating,
          title: dto.title,
          comment: dto.comment,
          imageUrls: dto.imageUrls ?? [],
          videoUrls: dto.videoUrls ?? [],
          isVerifiedPurchase: purchaseCount > 0,
        },
        include: { user: { select: { name: true } } },
      });

      const aggregate = await tx.review.aggregate({
        where: { productId: dto.productId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      await tx.product.update({
        where: { id: dto.productId },
        data: { averageRating: aggregate._avg.rating, reviewCount: aggregate._count._all },
      });

      return {
        id: review.id,
        productId: review.productId,
        authorName: review.user.name,
        rating: review.rating as Review['rating'],
        title: review.title,
        comment: review.comment,
        imageUrls: review.imageUrls,
        videoUrls: review.videoUrls,
        isVerifiedPurchase: review.isVerifiedPurchase,
        helpfulCount: review.helpfulCount,
        createdAt: review.createdAt.toISOString(),
      };
    });
  }

  /** `averageRating`/`reviewCount` vêm do cache denormalizado em `Product` (ver Módulo 2) — só a distribuição por nota exige agregação aqui. */
  async getSummary(productId: string): Promise<ReviewsSummary> {
    const [product, ratingGroups] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id: productId },
        select: { averageRating: true, reviewCount: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { _all: true },
      }),
    ]);

    const countByRating = new Map(ratingGroups.map((group) => [group.rating, group._count._all]));
    const distribution: RatingDistributionEntry[] = ALL_RATINGS.map((rating) => ({
      rating,
      count: countByRating.get(rating) ?? 0,
    }));

    return {
      averageRating: product?.averageRating ?? null,
      reviewCount: product?.reviewCount ?? 0,
      distribution,
    };
  }
}
