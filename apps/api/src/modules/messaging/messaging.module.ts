import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { TextMessageSender } from './text-message-sender';
import { ConsoleTextMessageSender } from './console-text-message-sender';
import { TwilioTextMessageSender } from './twilio-text-message-sender';

/** Mesmo padrão de `createEmailSender` — o adapter sai das env vars presentes. */
export function createTextMessageSender(config: ConfigService<EnvConfig, true>): TextMessageSender {
  const accountSid = config.get('TWILIO_ACCOUNT_SID', { infer: true });
  const authToken = config.get('TWILIO_AUTH_TOKEN', { infer: true });
  const from = config.get('TWILIO_FROM', { infer: true });
  if (accountSid && authToken && from) {
    return new TwilioTextMessageSender({ accountSid, authToken, from });
  }
  if (config.get('NODE_ENV', { infer: true }) === 'production') {
    new Logger('MessagingModule').error(
      'Nenhum provedor de SMS configurado (TWILIO_*) — códigos de senha e lembretes por celular não serão enviados.',
    );
  }
  return new ConsoleTextMessageSender();
}

@Module({
  providers: [
    { provide: TextMessageSender, useFactory: createTextMessageSender, inject: [ConfigService] },
  ],
  exports: [TextMessageSender],
})
export class MessagingModule {}
