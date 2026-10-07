import type { TryOnAnalysisResult } from '@asn/types';

export interface TryOnAnalysisContext {
  /** Data URL da foto, já redimensionada no client — nunca persistida. `null` quando o adapter não usa foto. */
  photoBase64: string | null;
  product: { id: string; name: string; brandName: string; categoryName: string };
}

/**
 * Porta de análise do Provador Digital (Módulo 7): "dado um produto (e, se
 * o adapter usar, uma foto), gerar um parecer de estilo/caimento". Duas
 * implementações — `ClaudeTryOnAnalyzer` (visão computacional sobre a foto)
 * e `StyleGuideTryOnAnalyzer` (guia da loja, sem foto e sem serviço
 * externo) — escolhidas em runtime pela factory em `tryon.module.ts`
 * conforme `ASN_ANTHROPIC_API_KEY` estar configurada ou não. Quando o
 * cliente informa a medida do pé, o tamanho devolvido aqui é substituído
 * pelo da tabela de medidas (ver `TryOnService`). Classe abstrata pelo
 * mesmo motivo de `PaymentGateway`: é o próprio token de injeção do Nest.
 */
export abstract class TryOnAnalyzer {
  /** `true` = o site pede a foto e ela é obrigatória; `false` = o site nem pede. */
  abstract readonly usesPhoto: boolean;
  abstract analyze(context: TryOnAnalysisContext): Promise<TryOnAnalysisResult>;
}
