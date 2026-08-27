import { Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResult, ProductQuestion } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `askerName` grava o nome do usuário autenticado NO MOMENTO da pergunta
   * (não uma FK para `User` — mesmo motivo do comentário original no
   * schema: Q&A tradicionalmente mostra só um nome de exibição). Perguntar
   * de fato exige conta agora que a Área do Cliente existe; sem resposta
   * ainda (`answer: null`), aguardando alguém do time responder.
   */
  async create(askerName: string, dto: CreateQuestionDto): Promise<ProductQuestion> {
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

    const question = await this.prisma.productQuestion.create({
      data: { productId: dto.productId, askerName, question: dto.question },
    });

    return {
      id: question.id,
      productId: question.productId,
      askerName: question.askerName,
      question: question.question,
      answer: question.answer,
      answeredAt: question.answeredAt?.toISOString() ?? null,
      createdAt: question.createdAt.toISOString(),
    };
  }

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
