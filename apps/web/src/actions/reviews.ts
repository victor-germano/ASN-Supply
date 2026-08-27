'use server';

import { revalidatePath } from 'next/cache';
import type { CreateQuestionInput, CreateReviewInput, ProductQuestion, Review } from '@asn/types';
import { ApiError } from '@/services/apiClient';
import { createQuestion, createReview } from '@/services/reviews.service';

export type CreateReviewActionResult =
  { success: true; review: Review } | { success: false; message: string };
export type CreateQuestionActionResult =
  { success: true; question: ProductQuestion } | { success: false; message: string };

function genericErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Não foi possível enviar agora. Tente novamente em instantes.';
}

/**
 * `productSlug` só serve pra invalidar o cache de 120s de
 * `getReviews`/`getReviewsSummary` na página certa (`/produtos/[slug]`) —
 * sem isso, a avaliação recém-enviada só apareceria depois do cache
 * expirar sozinho, mesmo com a UI já mostrando sucesso.
 */
export async function createReviewAction(
  input: CreateReviewInput,
  productSlug: string,
): Promise<CreateReviewActionResult> {
  try {
    const review = await createReview(input);
    revalidatePath(`/produtos/${productSlug}`);
    return { success: true, review };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}

export async function createQuestionAction(
  input: CreateQuestionInput,
  productSlug: string,
): Promise<CreateQuestionActionResult> {
  try {
    const question = await createQuestion(input);
    revalidatePath(`/produtos/${productSlug}`);
    return { success: true, question };
  } catch (error) {
    return { success: false, message: genericErrorMessage(error) };
  }
}
