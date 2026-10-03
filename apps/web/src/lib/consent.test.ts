import { describe, expect, it } from 'vitest';
import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  buildConsentCookie,
  parseConsent,
  readConsentCookie,
  serializeConsent,
} from './consent';

const state = { version: CONSENT_VERSION, analytics: true, decidedAt: '2026-10-03T12:00:00.000Z' };

describe('consentimento', () => {
  it('ida e volta preserva a escolha', () => {
    expect(parseConsent(serializeConsent(state))).toEqual(state);
  });

  it('lê o cookie no meio de outros', () => {
    const header = `asn_at=abc; ${CONSENT_COOKIE}=${serializeConsent(state)}; outro=1`;
    expect(readConsentCookie(header)).toEqual(state);
  });

  it.each([
    ['ausente', undefined],
    ['corrompido', '%7Bnao-e-json'],
    [
      'versão antiga (pergunta de novo)',
      serializeConsent({ ...state, version: CONSENT_VERSION - 1 }),
    ],
    ['campo faltando', encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION }))],
  ])('sem decisão válida: %s', (_caso, raw) => {
    expect(parseConsent(raw)).toBeNull();
  });

  it('cookie tem validade, SameSite e Secure em produção', () => {
    const cookie = buildConsentCookie(state, true);
    expect(cookie).toContain('Max-Age=');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(buildConsentCookie(state, false)).not.toContain('Secure');
  });
});
