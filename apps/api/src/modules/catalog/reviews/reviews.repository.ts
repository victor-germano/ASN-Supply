import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResult, RatingDistributionEntry, Review, ReviewsSummary } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';
import { FirestoreService } from '../../firestore/firestore.service';
import { AlgoliaService } from '../../algolia/algolia.service';
import type { CreateReviewDto } from './dto/create-review.dto';

const ALL_RATINGS = [5, 4, 3, 2, 1] as const;

/**
 * `averageRating`/`reviewCount` do produto vivem no Firestore desde a Fase 3
 * da migração (ver C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md)
 * — Review em si continua no Postgres (Fase 4 ainda não chegou), mas o
 * contador denormalizado que ele escreve mudou de lugar junto com o Product.
 */
@Injectable()
export class ReviewsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firestore: FirestoreService,
    private readonly algolia: AlgoliaService,
  ) {}

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
   * substitui a existente. `isVerifiedPurchase` é calculado aqui, nunca
   * aceito do client: verdade só se existir algum `OrderItem` deste produto
   * num pedido deste usuário. `averageRating`/`reviewCount` do produto
   * (Firestore) são recalculados logo após a criação — não dá pra fazer
   * isso atomicamente na mesma transação do Postgres (são dois bancos
   * diferentes agora), então a ordem é: criar a review (Postgres) primeiro,
   * só então atualizar o contador (Firestore) — se o segundo passo falhar,
   * a review já existe e o contador fica temporariamente desatualizado até
   * a próxima review corrigir, nunca o contrário (nunca um contador sem a
   * review que o gerou).
   */
  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const productSnap = await this.firestore.db.collection('products').doc(dto.productId).get();
    if (!productSnap.exists) {
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

    const review = await this.prisma.review.create({
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

    const aggregate = await this.prisma.review.aggregate({
      where: { productId: dto.productId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const averageRating = aggregate._avg.rating;
    const reviewCount = aggregate._count._all;
    await this.firestore.db
      .collection('products')
      .doc(dto.productId)
      .set({ averageRating, reviewCount }, { merge: true });
    await this.algolia.updateRating(dto.productId, averageRating, reviewCount);

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
  }

  /** `averageRating`/`reviewCount` vêm do cache denormalizado em `Product` (Firestore) — só a distribuição por nota exige agregação aqui (Postgres). */
  async getSummary(productId: string): Promise<ReviewsSummary> {
    const [productSnap, ratingGroups] = await Promise.all([
      this.firestore.db.collection('products').doc(productId).get(),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { _all: true },
      }),
    ]);
    const product = productSnap.data() as
      { averageRating: number | null; reviewCount: number } | undefined;

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
