import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailSender } from './email-sender';
import { ConsoleEmailSender } from './console-email-sender';
import { ResendEmailSender } from './resend-email-sender';
import type { EnvConfig } from '../../config/env.validation';

/** Mesmo padrão de `createTryOnAnalyzer` (`tryon.module.ts`) — escolhe o adapter em runtime pela env var presente. */
export function createEmailSender(config: ConfigService<EnvConfig, true>): EmailSender {
  return config.get('RESEND_API_KEY', { infer: true })
    ? new ResendEmailSender(config)
    : new ConsoleEmailSender();
}

@Module({
  providers: [{ provide: EmailSender, useFactory: createEmailSender, inject: [ConfigService] }],
  exports: [EmailSender],
})
export class EmailModule {}
