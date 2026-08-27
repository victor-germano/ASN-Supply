import * as Sentry from '@sentry/nextjs';

/**
 * Convenção do Next.js (App Router) — `register()` roda uma vez, no boot
 * de cada runtime do servidor. Runtime de navegador é outro arquivo
 * (`instrumentation-client.ts`), carregado de forma completamente
 * diferente (injetado pelo plugin do `withSentryConfig`), não passa por
 * aqui.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

/** Erros de Server Components/Actions aninhados — recomendado pelo próprio SDK, não capturado automaticamente sem isto. */
export const onRequestError = Sentry.captureRequestError;
