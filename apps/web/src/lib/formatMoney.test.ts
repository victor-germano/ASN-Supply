import { describe, expect, it } from 'vitest';
import { centsToReais, formatMoney, reaisToCents } from './formatMoney';

describe('reaisToCents / centsToReais', () => {
  it('converte reais com centavos sem erro de float', () => {
    expect(reaisToCents(499.9)).toBe(49990);
    expect(reaisToCents(0.29)).toBe(29);
    expect(reaisToCents(1299)).toBe(129900);
  });

  it('ida e volta preserva o valor', () => {
    expect(reaisToCents(centsToReais(129990))).toBe(129990);
  });
});

describe('formatMoney', () => {
  it('formata centavos como moeda brasileira', () => {
    expect(formatMoney({ amountInCents: 89900, currency: 'BRL' })).toBe('R$ 899,00');
  });

  it('lida com valores sem centavos "quebrados"', () => {
    expect(formatMoney({ amountInCents: 10000, currency: 'BRL' })).toBe('R$ 100,00');
  });

  it('lida com zero', () => {
    expect(formatMoney({ amountInCents: 0, currency: 'BRL' })).toBe('R$ 0,00');
  });
});
