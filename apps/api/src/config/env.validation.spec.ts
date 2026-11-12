import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

const validConfig = {
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

  it('rejeita JWT_SECRET curto (risco de segurança)', () => {
    expect(() => validateEnv({ ...validConfig, JWT_SECRET: 'curto' })).toThrow(/JWT_SECRET/);
  });

  it('rejeita NODE_ENV fora do enum permitido', () => {
    expect(() => validateEnv({ ...validConfig, NODE_ENV: 'staging' })).toThrow();
  });

  it('produção exige INTERNAL_API_KEY, CLOUDINARY_URL, FIREBASE_SERVICE_ACCOUNT_BASE64 e recusa o JWT_SECRET de exemplo', () => {
    const production = { ...validConfig, NODE_ENV: 'production' };
    expect(() => validateEnv(production)).toThrow(/INTERNAL_API_KEY/);
    const withInternalKey = { ...production, INTERNAL_API_KEY: 'k'.repeat(32) };
    expect(() => validateEnv(withInternalKey)).toThrow(/CLOUDINARY_URL/);
    const withCloudinary = { ...withInternalKey, CLOUDINARY_URL: 'cloudinary://key:secret@cloud' };
    expect(() => validateEnv(withCloudinary)).toThrow(/FIREBASE_SERVICE_ACCOUNT_BASE64/);
    const withFirebase = {
      ...withCloudinary,
      FIREBASE_SERVICE_ACCOUNT_BASE64: 'ZmFrZS1zZXJ2aWNlLWFjY291bnQ=',
    };
    expect(validateEnv(withFirebase).NODE_ENV).toBe('production');
    expect(() =>
      validateEnv({
        ...withFirebase,
        JWT_SECRET: 'troque-este-valor-por-um-segredo-forte-de-32-chars-ou-mais',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('converte PORT string em number', () => {
    const result = validateEnv({ ...validConfig, PORT: '4000' });
    expect(result.PORT).toBe(4000);
  });
});
