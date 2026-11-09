import { Injectable, NotFoundException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import type { PaginatedResult, ProductQuestion } from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';
import type { CreateQuestionDto } from './dto/create-question.dto';

interface QuestionDoc {
  askerName: string;
  question: string;
  answer: string | null;
  answeredAt: Timestamp | null;
  createdAt: Timestamp;
}

@Injectable()
export class QuestionsRepository {
  constructor(private readonly firestore: FirestoreService) {}

  private questions(productId: string) {
    return this.firestore.db.collection('products').doc(productId).collection('questions');
  }

  /**
   * `askerName` grava o nome do usuário autenticado NO MOMENTO da pergunta
   * (não uma referência pro usuário — mesmo motivo do comentário original:
   * Q&A tradicionalmente mostra só um nome de exibição).
   */
  async create(askerName: string, dto: CreateQuestionDto): Promise<ProductQuestion> {
    const productSnap = await this.firestore.db.collection('products').doc(dto.productId).get();
    if (!productSnap.exists) {
      throw new NotFoundException({
        errorCode: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado.',
      });
    }

    const ref = this.questions(dto.productId).doc();
    const doc: QuestionDoc = {
      askerName,
      question: dto.question,
      answer: null,
      answeredAt: null,
      createdAt: Timestamp.now(),
    };
    await ref.set(doc);

    return {
      id: ref.id,
      productId: dto.productId,
      askerName: doc.askerName,
      question: doc.question,
      answer: doc.answer,
      answeredAt: null,
      createdAt: doc.createdAt.toDate().toISOString(),
    };
  }

  async findByProduct(
    productId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<PaginatedResult<ProductQuestion>> {
    const snapshot = await this.questions(productId).get();
    const all = snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as QuestionDoc }))
      // Respondidas primeiro (é o que tem valor pra quem está lendo), depois mais recentes.
      .sort((a, b) => {
        const answeredDiff =
          Number(b.data.answeredAt !== null) - Number(a.data.answeredAt !== null);
        if (answeredDiff !== 0) return answeredDiff;
        return b.data.createdAt.toMillis() - a.data.createdAt.toMillis();
      });

    const totalItems = all.length;
    const items = all
      .slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize)
      .map((entry) => ({
        id: entry.id,
        productId,
        askerName: entry.data.askerName,
        question: entry.data.question,
        answer: entry.data.answer,
        answeredAt: entry.data.answeredAt?.toDate().toISOString() ?? null,
        createdAt: entry.data.createdAt.toDate().toISOString(),
      }));

    return {
      items,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pagination.pageSize)),
    };
  }
}
