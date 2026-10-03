import { describe, expect, it } from 'vitest';
import { maskBrazilianMobile, normalizeBrazilianMobile } from './phone';

describe('normalizeBrazilianMobile', () => {
  it.each([
    ['(11) 99888-7766', '+5511998887766'],
    ['11998887766', '+5511998887766'],
    ['+55 11 99888-7766', '+5511998887766'],
    ['5521987654321', '+5521987654321'],
  ])('aceita %s', (input, expected) => {
    expect(normalizeBrazilianMobile(input)).toBe(expected);
  });

  it.each([
    ['telefone fixo', '(11) 3333-4444'],
    ['sem o nono dígito', '1188887766'],
    ['DDD inválido', '(01) 99888-7766'],
    ['DDD terminado em 0 inexistente', '(10) 99888-7766'],
    ['curto demais', '99888-7766'],
    ['vazio', ''],
  ])('recusa %s', (_motivo, input) => {
    expect(normalizeBrazilianMobile(input)).toBeNull();
  });
});

describe('maskBrazilianMobile', () => {
  it('mostra só DDD, primeiro dígito e final', () => {
    expect(maskBrazilianMobile('+5511998887766')).toBe('(11) 9****-7766');
  });
});
