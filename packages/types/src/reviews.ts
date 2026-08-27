export interface ProductQuestion {
  id: string;
  productId: string;
  askerName: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}

/** `askerName` nunca vem daqui — o servidor sempre usa o nome do usuário autenticado (`POST /questions` exige conta). */
export interface CreateQuestionInput {
  productId: string;
  question: string;
}

/** `authorName`/`isVerifiedPurchase` nunca vêm daqui — calculados pelo servidor a partir do usuário autenticado e do histórico de pedidos dele (`POST /reviews` exige conta). */
export interface CreateReviewInput {
  productId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  comment: string;
  imageUrls?: string[];
  videoUrls?: string[];
}

export interface RatingDistributionEntry {
  rating: 1 | 2 | 3 | 4 | 5;
  count: number;
}

/** Agregado usado para a barra de distribuição de notas na seção de avaliações. */
export interface ReviewsSummary {
  averageRating: number | null;
  reviewCount: number;
  distribution: RatingDistributionEntry[];
}
