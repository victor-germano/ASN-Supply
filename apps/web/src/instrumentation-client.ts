/**
 * Convenção mais nova do Next.js pro runtime de navegador — substitui
 * `sentry.client.config.ts` (agora vazio, ver comentário lá), necessário
 * porque o arquivo antigo não é carregado sob Turbopack. `sentry.server.
 * config.ts`/`sentry.edge.config.ts` continuam valendo (importados por
 * `instrumentation.ts`) — só o runtime de navegador mudou de convenção.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

/** Rastreia navegação entre rotas como transações — o próprio build do SDK pede este export explicitamente. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
