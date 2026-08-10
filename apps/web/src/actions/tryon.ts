'use server';

import type { TryOnAnalysisInput, TryOnAnalysisResult } from '@asn/types';
import { ApiError } from '@/services/apiClient';
import { analyzeTryOn } from '@/services/tryon.service';

export type AnalyzeTryOnActionResult =
  { success: true; result: TryOnAnalysisResult } | { success: false; message: string };

/**
 * Server Action do Provador Digital — mantém a chamada à API (com a URL
 * base e, futuramente, a chave da Anthropic) inteiramente no servidor, e
 * traduz erros (`ApiError`, ex: produto não encontrado, foto inválida)
 * numa mensagem que a UI pode mostrar sem expor detalhes internos.
 */
export async function analyzeTryOnAction(
  input: TryOnAnalysisInput,
): Promise<AnalyzeTryOnActionResult> {
  try {
    const result = await analyzeTryOn(input);
    return { success: true, result };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível analisar sua foto agora. Tente novamente em instantes.';
    return { success: false, message };
  }
}
