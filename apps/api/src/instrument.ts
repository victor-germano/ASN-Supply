/**
 * Precisa ser o PRIMEIRO import de `main.ts` (antes de qualquer outra
 * coisa, inclusive `reflect-metadata`) — é assim que o SDK do Sentry
 * consegue instrumentar automaticamente HTTP/Prisma/etc, interceptando o
 * `require`/`import` desses módulos antes que a aplicação os carregue de
 * verdade. Importar depois de outra coisa (ou dentro de uma função)
 * simplesmente não funciona direito.
 *
 * Sem `SENTRY_DSN` configurada, `Sentry.init` roda com dsn vazio — o SDK
 * não manda nada pra lugar nenhum, comportamento padrão dele, não uma
 * checagem nossa. Dev/CI não dependem de conta no Sentry.
 */
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
