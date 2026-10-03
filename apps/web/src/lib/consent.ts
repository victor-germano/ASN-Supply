/**
 * Consentimento de cookies (LGPD). Só existe uma categoria opcional de
 * verdade hoje — `analytics` (estatística de visitas, Plausible, sem
 * cookie). O site não usa publicidade nem rastreamento de terceiros; o
 * banner diz isso em vez de inventar categorias vazias.
 *
 * Guardado num cookie próprio (`asn_consent`), não em localStorage: é a
 * prova da escolha, e o servidor também consegue lê-lo se precisar.
 */

export const CONSENT_COOKIE = 'asn_consent';
/** Mudou o que o site usa (nova categoria, novo fornecedor)? Suba a versão: todo mundo é perguntado de novo. */
export const CONSENT_VERSION = 1;
/** A escolha vale 6 meses — depois o banner pergunta de novo (boa prática da ANPD). */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export interface ConsentState {
  version: number;
  analytics: boolean;
  /** ISO 8601 — quando a pessoa decidiu (registro da escolha). */
  decidedAt: string;
}

export function serializeConsent(state: ConsentState): string {
  return encodeURIComponent(JSON.stringify(state));
}

/** `null` = sem decisão válida (nunca escolheu, versão antiga ou cookie corrompido) → mostrar o banner. */
export function parseConsent(raw: string | undefined | null): ConsentState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentState>;
    if (value.version !== CONSENT_VERSION) return null;
    if (typeof value.analytics !== 'boolean' || typeof value.decidedAt !== 'string') return null;
    return { version: value.version, analytics: value.analytics, decidedAt: value.decidedAt };
  } catch {
    return null;
  }
}

/** Lê do `document.cookie` (navegador). */
export function readConsentCookie(cookieHeader: string): ConsentState | null {
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(match?.slice(CONSENT_COOKIE.length + 1));
}

export function buildConsentCookie(state: ConsentState, secure: boolean): string {
  return [
    `${CONSENT_COOKIE}=${serializeConsent(state)}`,
    'Path=/',
    `Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
