import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

const validConfig = {
  DATABASE_URL: 'postgresql://asn:asn@localhost:5432/asn_supply',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'a'.repeat(32),
};

describe('validateEnv', () => {
  it('aceita uma configuração mínima válida e aplica os defaults', () => {
    const result = validateEnv(validConfig);

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3400);
    expect(result.JWT_EXPIRES_IN).toBe('15m');
  });

  it('rejeita quando DATABASE_URL está ausente', () => {
    const { DATABASE_URL: _omit, ...rest } = validConfig;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('rejeita JWT_SECRET curto (risco de segurança)', () => {
    expect(() => validateEnv({ ...validConfig, JWT_SECRET: 'curto' })).toThrow(/JWT_SECRET/);
  });

  it('rejeita NODE_ENV fora do enum permitido', () => {
    expect(() => validateEnv({ ...validConfig, NODE_ENV: 'staging' })).toThrow();
  });

  it('produção exige INTERNAL_API_KEY e recusa o JWT_SECRET de exemplo', () => {
    const production = { ...validConfig, NODE_ENV: 'production' };
    expect(() => validateEnv(production)).toThrow(/INTERNAL_API_KEY/);
    const withKey = { ...production, INTERNAL_API_KEY: 'k'.repeat(32) };
    expect(validateEnv(withKey).NODE_ENV).toBe('production');
    expect(() =>
      validateEnv({
        ...withKey,
        JWT_SECRET: 'troque-este-valor-por-um-segredo-forte-de-32-chars-ou-mais',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('converte PORT string em number', () => {
    const result = validateEnv({ ...validConfig, PORT: '4000' });
    expect(result.PORT).toBe(4000);
  });
});
