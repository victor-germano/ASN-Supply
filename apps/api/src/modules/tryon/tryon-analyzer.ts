import type { TryOnAnalysisResult } from '@asn/types';

export interface TryOnAnalysisContext {
  /** Data URL da foto, já redimensionada no client — nunca persistida (ver TryOnService). */
  photoBase64: string;
  product: { name: string; brandName: string; categoryName: string };
}

/**
 * Porta de análise do Provador Digital (Módulo 7): abstração sobre "dado
 * uma foto + um produto, gerar um parecer de estilo/caimento". Duas
 * implementações — `ClaudeTryOnAnalyzer` (real, via visão computacional) e
 * `MockTryOnAnalyzer` (parecer ilustrativo) — escolhidas em runtime pela
 * factory em `tryon.module.ts` conforme `ANTHROPIC_API_KEY` estar configurada
 * ou não. Classe abstrata pelo mesmo motivo de `PaymentGateway`: é o próprio
 * token de injeção do Nest.
 */
export abstract class TryOnAnalyzer {
  abstract analyze(context: TryOnAnalysisContext): Promise<TryOnAnalysisResult>;
}
