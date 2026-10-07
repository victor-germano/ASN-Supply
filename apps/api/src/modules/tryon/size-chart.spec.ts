import { describe, expect, it } from 'vitest';
import { fitWithoutMeasure, recommendSizeByFootLength } from './size-chart';

describe('recommendSizeByFootLength', () => {
  it.each([
    [24, '38'],
    [24.3, '39'],
    [25.5, '40'],
    [25.6, '41'],
    [29.5, '44'],
  ])('pé de %s cm → %s (em dúvida entre dois, o maior)', (cm, size) => {
    expect(recommendSizeByFootLength(cm, []).recommendedSize).toBe(size);
  });

  it('não inventa número fora da tabela', () => {
    expect(recommendSizeByFootLength(22, []).recommendedSize).toBeNull();
    expect(recommendSizeByFootLength(31, []).recommendedSize).toBeNull();
  });

  it('avisa quando o tamanho certo está sem estoque, sem trocar a indicação', () => {
    const result = recommendSizeByFootLength(26, ['38', '42']);
    expect(result.recommendedSize).toBe('41');
    expect(result.note).toContain('sem o 41 em estoque');
    expect(recommendSizeByFootLength(26, ['41']).note).not.toContain('estoque');
  });

  it('sem medida, ensina a medir em vez de chutar', () => {
    const result = fitWithoutMeasure();
    expect(result.recommendedSize).toBeNull();
    expect(result.note).toContain('calcanhar na parede');
  });
});
