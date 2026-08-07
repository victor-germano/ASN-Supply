import { describe, expect, it } from 'vitest';
import { formatMoney } from './formatMoney';

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
