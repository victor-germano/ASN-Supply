import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailSender } from './email-sender';
import { ConsoleEmailSender } from './console-email-sender';
import { ResendEmailSender } from './resend-email-sender';
import { SmtpEmailSender } from './smtp-email-sender';
import type { EnvConfig } from '../../config/env.validation';

/** Mesmo padrão de `createTryOnAnalyzer` (`tryon.module.ts`) — escolhe o adapter em runtime pela env var presente. */
export function createEmailSender(config: ConfigService<EnvConfig, true>): EmailSender {
  if (config.get('RESEND_API_KEY', { infer: true })) return new ResendEmailSender(config);
  if (config.get('SMTP_HOST', { infer: true })) return new SmtpEmailSender(config);
  // Em dev o console basta; em produção isto significa que "esqueci a
  // senha" e confirmação de pedido nunca chegam a ninguém — alto e claro
  // no log de inicialização em vez de descobrir pelo cliente reclamando.
  if (config.get('NODE_ENV', { infer: true }) === 'production') {
    new Logger('EmailModule').error(
      'Nenhum provedor de e-mail configurado (RESEND_API_KEY ou SMTP_HOST) — e-mails não serão enviados.',
    );
  }
  return new ConsoleEmailSender();
}

@Module({
  providers: [{ provide: EmailSender, useFactory: createEmailSender, inject: [ConfigService] }],
  exports: [EmailSender],
})
export class EmailModule {}
