/**
 * Provador Digital (Módulo 7). Dois modos, decididos pela API conforme
 * `ASN_ANTHROPIC_API_KEY` existir (ver `TryOnConfig`):
 * - com a chave: análise de estilo sobre a foto do cliente, via IA de visão;
 * - sem a chave: guia de estilo da loja para o modelo escolhido, sem foto.
 * Nos dois, o tamanho sai da tabela de medidas quando o cliente informa o
 * comprimento do pé.
 */
export interface TryOnConfig {
  /** `true` = a tela pede a foto (obrigatória); `false` = nem pede. */
  usesPhoto: boolean;
}

export interface TryOnAnalysisInput {
  /** Data URL (ex: "data:image/jpeg;base64,...") — já redimensionada no client. Só quando `usesPhoto`. */
  photoBase64?: string;
  productId: string;
  /** Comprimento do pé em centímetros. */
  footLengthCm?: number;
}

export interface FitRecommendation {
  recommendedSize: string | null;
  note: string;
}

export interface TryOnAnalysisResult {
  /** Legado: nenhum adapter devolve mais um parecer simulado. */
  isSimulated: boolean;
  styleAnalysis: string;
  fitRecommendation: FitRecommendation;
  /** De onde vem o parecer (ex: guia de estilo da loja); `null` na análise por foto. */
  disclaimer: string | null;
}
