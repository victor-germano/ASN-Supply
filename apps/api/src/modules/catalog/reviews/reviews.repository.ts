import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import type { PaginatedResult, RatingDistributionEntry, Review, ReviewsSummary } from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';
import { AlgoliaService } from '../../algolia/algolia.service';
import type { CreateReviewDto } from './dto/create-review.dto';

const ALL_RATINGS = [5, 4, 3, 2, 1] as const;

interface ReviewDoc {
  userId: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  comment: string;
  imageUrls: string[];
  videoUrls: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Timestamp;
}

/** Só os campos de nota do produto — o resto do `ProductDoc` não interessa aqui. */
interface ProductRatingDoc {
  ratingSum?: number;
  reviewCount?: number;
  averageRating?: number | null;
  ratingHistogram?: Partial<Record<'1' | '2' | '3' | '4' | '5', number>>;
}

interface OrderItemDoc {
  productSlug: string;
}

/**
 * Review migrou pro Firestore na Fase 4 (ver
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md):
 * `products/{slug}/reviews/{userId}` — o `id` do documento É o `userId`, o
 * que já garante "uma avaliação por cliente por produto" de graça (um
 * segundo `create` pro mesmo par é só sobrescrever o mesmo doc, nunca uma
 * segunda linha).
 *
 * `averageRating`/`reviewCount` do produto deixam de vir de um `aggregate`
 * recalculado a cada review (`review.groupBy`/`review.aggregate` no
 * Postgres) e passam a ser contadores desnormalizados (`ratingSum`,
 * `reviewCount`, `ratingHistogram`) incrementados dentro da MESMA transação
 * que cria a review — ler o histograma de notas (usado em `getSummary`) não
 * precisa mais de nenhuma agregação, só o próprio doc do produto.
 */
@Injectable()
export class ReviewsRepository {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly algolia: AlgoliaService,
  ) {}

  private reviews(productId: string) {
    return this.firestore.db.collection('products').doc(productId).collection('reviews');
  }

  async findByProduct(
    productId: string,
    rating: number | undefined,
    pagination: { page: number; pageSize: number },
  ): Promise<PaginatedResult<Review>> {
    const snapshot = await this.reviews(productId).get();
    const all = snapshot.docs
      .map((doc) => doc.data() as ReviewDoc)
      .filter((doc) => rating === undefined || doc.rating === rating)
      // Mais úteis primeiro, depois mais recentes — reflete o que a
      // maioria das lojas mostra por padrão na aba de avaliações.
      .sort((a, b) => {
        const helpfulDiff = b.helpfulCount - a.helpfulCount;
        if (helpfulDiff !== 0) return helpfulDiff;
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });

    const totalItems = all.length;
    const items = all
      .slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize)
      .map((doc) => toReview(productId, doc));

    return {
      items,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pagination.pageSize)),
    };
  }

  /**
   * Uma avaliação por cliente por produto, garantida pelo próprio `id` do
   * documento (`userId`) — uma segunda tentativa vira 409, checado dentro
   * da transação que também atualiza o contador de nota do produto (lê
   * tudo antes de escrever, regra do Firestore). `isVerifiedPurchase` é
   * calculado aqui, nunca aceito do client: verdade só se existir algum
   * pedido deste produto feito por este usuário no Firestore (Order/
   * OrderItem saíram do Postgres na Fase 3 — a checagem antiga via
   * `prisma.orderItem.count` parou de ver pedidos novos desde então e
   * nunca foi corrigida; aproveitado o trabalho nesta review para arrumar).
   */
  async create(userId: string, authorName: string, dto: CreateReviewDto): Promise<Review> {
    const productRef = this.firestore.db.collection('products').doc(dto.productId);
    const reviewRef = this.reviews(dto.productId).doc(userId);

    const isVerifiedPurchase = await this.hasPurchased(userId, dto.productId);
    const createdAt = Timestamp.now();
    const reviewDoc: ReviewDoc = {
      userId,
      authorName,
      rating: dto.rating,
      title: dto.title,
      comment: dto.comment,
      imageUrls: dto.imageUrls ?? [],
      videoUrls: dto.videoUrls ?? [],
      isVerifiedPurchase,
      helpfulCount: 0,
      createdAt,
    };

    const { averageRating, reviewCount } = await this.firestore.db.runTransaction(async (tx) => {
      const [reviewSnap, productSnap] = await Promise.all([tx.get(reviewRef), tx.get(productRef)]);
      if (reviewSnap.exists) {
        throw new ConflictException({
          errorCode: 'REVIEW_ALREADY_EXISTS',
          message: 'Você já avaliou este produto.',
        });
      }
      if (!productSnap.exists) {
        throw new NotFoundException({
          errorCode: 'PRODUCT_NOT_FOUND',
          message: 'Produto não encontrado.',
        });
      }

      const product = productSnap.data() as ProductRatingDoc;
      const newReviewCount = (product.reviewCount ?? 0) + 1;
      const newRatingSum = (product.ratingSum ?? 0) + dto.rating;
      const newAverageRating = newRatingSum / newReviewCount;
      const histogramKey = String(dto.rating) as '1' | '2' | '3' | '4' | '5';
      const newHistogram = {
        ...product.ratingHistogram,
        [histogramKey]: (product.ratingHistogram?.[histogramKey] ?? 0) + 1,
      };

      tx.set(reviewRef, reviewDoc);
      tx.set(
        productRef,
        {
          ratingSum: newRatingSum,
          reviewCount: newReviewCount,
          averageRating: newAverageRating,
          ratingHistogram: newHistogram,
        } satisfies ProductRatingDoc,
        { merge: true },
      );
      return { averageRating: newAverageRating, reviewCount: newReviewCount };
    });

    await this.algolia.updateRating(dto.productId, averageRating, reviewCount);

    return toReview(dto.productId, reviewDoc);
  }

  /** `averageRating`/`reviewCount`/distribuição por nota vêm todos do mesmo doc do produto — sem agregação nenhuma em tempo de leitura. */
  async getSummary(productId: string): Promise<ReviewsSummary> {
    const snap = await this.firestore.db.collection('products').doc(productId).get();
    const product = snap.data() as ProductRatingDoc | undefined;
    const histogram = product?.ratingHistogram ?? {};

    const distribution: RatingDistributionEntry[] = ALL_RATINGS.map((rating) => ({
      rating,
      count: histogram[String(rating) as '1' | '2' | '3' | '4' | '5'] ?? 0,
    }));

    return {
      averageRating: product?.averageRating ?? null,
      reviewCount: product?.reviewCount ?? 0,
      distribution,
    };
  }

  /** Algum item, em algum pedido deste usuário, com este produto (slug). */
  private async hasPurchased(userId: string, productSlug: string): Promise<boolean> {
    const ordersSnapshot = await this.firestore.db
      .collection('orders')
      .where('userId', '==', userId)
      .get();
    if (ordersSnapshot.empty) return false;

    const itemsSnapshots = await Promise.all(
      ordersSnapshot.docs.map((order) => order.ref.collection('items').get()),
    );
    return itemsSnapshots.some((items) =>
      items.docs.some((item) => (item.data() as OrderItemDoc).productSlug === productSlug),
    );
  }
}

function toReview(productId: string, doc: ReviewDoc): Review {
  return {
    id: doc.userId,
    productId,
    authorName: doc.authorName,
    rating: doc.rating,
    title: doc.title,
    comment: doc.comment,
    imageUrls: doc.imageUrls,
    videoUrls: doc.videoUrls,
    isVerifiedPurchase: doc.isVerifiedPurchase,
    helpfulCount: doc.helpfulCount,
    createdAt: doc.createdAt.toDate().toISOString(),
  };
}
