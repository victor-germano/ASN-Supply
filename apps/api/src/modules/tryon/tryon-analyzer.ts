import type { TryOnAnalysisResult } from '@asn/types';

export interface TryOnAnalysisContext {
  /** Data URL da foto, já redimensionada no client — nunca persistida (ver TryOnService). */
  photoBase64: string;
  product: { name: string; brandName: string; categoryName: string };
}

/**
 * Porta de análise do Provador Digital (Módulo 7): abstração sobre "dado
 * uma foto + um produto, gerar um parecer de estilo/caimento", implementada
 * hoje só por `MockTryOnAnalyzer` (sem ANTHROPIC_API_KEY ainda — decisão do
 * usuário). Classe abstrata pelo mesmo motivo de `PaymentGateway`: é o
 * próprio token de injeção do Nest.
 *
 * Plugar a Anthropic API de verdade no futuro é escrever um adapter que
 * implementa `analyze` chamando visão computacional de verdade e trocar o
 * `useClass` em `tryon.module.ts` — controller e frontend não mudam.
 */
export abstract class TryOnAnalyzer {
  abstract analyze(context: TryOnAnalysisContext): Promise<TryOnAnalysisResult>;
}
