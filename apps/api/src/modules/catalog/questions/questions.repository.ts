import { Injectable } from '@nestjs/common';
import type { PaginatedResult, ProductQuestion } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QuestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(
    productId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<PaginatedResult<ProductQuestion>> {
    const where = { productId };

    const [totalItems, questions] = await Promise.all([
      this.prisma.productQuestion.count({ where }),
      this.prisma.productQuestion.findMany({
        where,
        // Respondidas primeiro (é o que tem valor pra quem está lendo),
        // depois mais recentes.
        orderBy: [{ answeredAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
    ]);

    return {
      items: questions.map((question) => ({
        id: question.id,
        productId: question.productId,
        askerName: question.askerName,
        question: question.question,
        answer: question.answer,
        answeredAt: question.answeredAt?.toISOString() ?? null,
        createdAt: question.createdAt.toISOString(),
      })),
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pagination.pageSize)),
    };
  }
}
