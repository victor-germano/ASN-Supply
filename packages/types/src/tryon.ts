/**
 * Provador Digital (Módulo 7): análise textual/de estilo via IA de visão
 * (Claude), sem gerar imagem composta ainda (decisão do usuário). Sem
 * ASN_ANTHROPIC_API_KEY configurada, a análise vem de um adapter simulado
 * (`MockTryOnAnalyzer`, ver apps/api) — `isSimulated` deixa isso explícito
 * para o frontend nunca apresentar uma prévia ilustrativa como se fosse
 * uma análise real da foto do cliente.
 */
export interface TryOnAnalysisInput {
  /** Data URL (ex: "data:image/jpeg;base64,...") — já redimensionada no client antes do envio. */
  photoBase64: string;
  productId: string;
}

export interface FitRecommendation {
  recommendedSize: string | null;
  note: string;
}

export interface TryOnAnalysisResult {
  isSimulated: boolean;
  styleAnalysis: string;
  fitRecommendation: FitRecommendation;
  /** Mensagem para o usuário quando `isSimulated` é `true`; `null` numa análise real. */
  disclaimer: string | null;
}
