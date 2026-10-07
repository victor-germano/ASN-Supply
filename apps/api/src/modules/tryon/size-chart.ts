import type { FitRecommendation } from '@asn/types';

/**
 * Mesma tabela exibida na página do produto (`SizeGuideTable` em apps/web)
 * — `cm` é o comprimento máximo de pé que cada numeração acomoda. Manter
 * as duas iguais.
 */
export const SIZE_CHART = [
  { br: '38', cm: 24 },
  { br: '39', cm: 24.5 },
  { br: '40', cm: 25.5 },
  { br: '41', cm: 26.5 },
  { br: '42', cm: 27.5 },
  { br: '43', cm: 28.5 },
  { br: '44', cm: 29.5 },
] as const;

/** Pé mais curto que isto fica folgado demais até no menor número da tabela. */
const SMALLEST_FOOT_CM = SIZE_CHART[0].cm - 1;

export const HOW_TO_MEASURE =
  'Para medir: encoste o calcanhar na parede, pise sobre uma folha de papel, marque a ponta do dedo mais longo e meça a distância em centímetros.';

/**
 * Tamanho pela medida do pé: o menor número cuja medida comporta o pé (em
 * dúvida entre dois, o maior — a mesma orientação da tabela de medidas).
 * `sizesInStock` só muda o aviso, nunca o número: indicar um tamanho errado
 * porque o certo acabou seria pior do que avisar que acabou.
 */
export function recommendSizeByFootLength(
  footLengthCm: number,
  sizesInStock: string[],
): FitRecommendation {
  const measure = `${String(footLengthCm).replace('.', ',')} cm`;

  if (footLengthCm < SMALLEST_FOOT_CM) {
    return {
      recommendedSize: null,
      note: `Para um pé de ${measure}, nossa menor numeração (${SIZE_CHART[0].br}) ficaria folgada. Fale com a gente antes de comprar para indicarmos a melhor opção.`,
    };
  }
  const match = SIZE_CHART.find((row) => footLengthCm <= row.cm);
  if (!match) {
    const largest = SIZE_CHART[SIZE_CHART.length - 1]!;
    return {
      recommendedSize: null,
      note: `Para um pé de ${measure}, nossa maior numeração (${largest.br}) ficaria apertada. Fale com a gente antes de comprar para indicarmos a melhor opção.`,
    };
  }

  const availability =
    sizesInStock.length === 0 || sizesInStock.includes(match.br)
      ? ''
      : ` No momento este modelo está sem o ${match.br} em estoque.`;
  return {
    recommendedSize: match.br,
    note: `Calculado para um pé de ${measure}, pela nossa tabela de medidas.${availability} Se não servir, a troca é gratuita em até 30 dias.`,
  };
}

export function fitWithoutMeasure(): FitRecommendation {
  return {
    recommendedSize: null,
    note: `Informe o comprimento do seu pé para receber o tamanho indicado. ${HOW_TO_MEASURE}`,
  };
}
