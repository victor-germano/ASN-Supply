/**
 * Estado de navegador com a escolha de cookies já feita — usado por todos
 * os specs (via `playwright.config.ts`) para o banner, que fica fixo no pé
 * da tela, não cobrir botões. O banner em si é testado em `cookies.spec.ts`,
 * que começa sem este estado.
 */
const baseURL = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3100');

export const decidedConsentState = {
  cookies: [
    {
      name: 'asn_consent',
      value: encodeURIComponent(
        JSON.stringify({ version: 1, analytics: false, decidedAt: '2026-01-01T00:00:00.000Z' }),
      ),
      domain: baseURL.hostname,
      path: '/',
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    },
  ],
  origins: [],
};
