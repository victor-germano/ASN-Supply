export interface ProductQuestion {
  id: string;
  productId: string;
  askerName: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
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
