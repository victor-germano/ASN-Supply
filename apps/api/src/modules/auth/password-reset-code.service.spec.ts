import { describe, expect, it } from 'vitest';
import { generateResetCode, hashResetCode } from './password-reset-code.service';

describe('generateResetCode', () => {
  it('sempre tem 6 dígitos (zeros à esquerda preservados)', () => {
    for (let i = 0; i < 500; i++) {
      expect(generateResetCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe('hashResetCode', () => {
  const secret = 'segredo-de-teste-com-mais-de-32-caracteres';

  it('é determinístico para o mesmo usuário e código', () => {
    expect(hashResetCode(secret, 'u1', '123456')).toBe(hashResetCode(secret, 'u1', '123456'));
  });

  it('o mesmo código em contas diferentes gera hashes diferentes', () => {
    expect(hashResetCode(secret, 'u1', '123456')).not.toBe(hashResetCode(secret, 'u2', '123456'));
  });

  it('sem o segredo certo o hash não bate (não dá pra quebrar só com o banco)', () => {
    expect(hashResetCode(secret, 'u1', '123456')).not.toBe(
      hashResetCode('outro-segredo-qualquer-com-32-caracteres', 'u1', '123456'),
    );
  });
});
