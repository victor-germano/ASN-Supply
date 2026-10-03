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
  // SMTP só com credencial completa: o Gmail da loja pode estar configurado
  // (host + usuário) antes de a senha de app existir — sem ela, cada envio
  // falharia na autenticação; melhor seguir no console até ser preenchida.
  const smtpUser = config.get('SMTP_USER', { infer: true });
  const smtpReady =
    config.get('SMTP_HOST', { infer: true }) &&
    (!smtpUser || config.get('SMTP_PASS', { infer: true }));
  if (smtpReady) return new SmtpEmailSender(config);
  // Em dev o console basta; em produção isto significa que "esqueci a
  // senha" e confirmação de pedido nunca chegam a ninguém — alto e claro
  // no log de inicialização em vez de descobrir pelo cliente reclamando.
  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
  if (isProduction) {
    new Logger('EmailModule').error(
      'Nenhum provedor de e-mail configurado (RESEND_API_KEY ou SMTP_HOST) — e-mails não serão enviados.',
    );
  }
  return new ConsoleEmailSender(!isProduction);
}

@Module({
  providers: [{ provide: EmailSender, useFactory: createEmailSender, inject: [ConfigService] }],
  exports: [EmailSender],
})
export class EmailModule {}
