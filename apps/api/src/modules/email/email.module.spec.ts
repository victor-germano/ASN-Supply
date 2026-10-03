import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { createEmailSender } from './email.module';
import { ConsoleEmailSender } from './console-email-sender';
import { SmtpEmailSender } from './smtp-email-sender';
import { ResendEmailSender } from './resend-email-sender';

function fakeConfig(
  values: Partial<Record<keyof EnvConfig, unknown>>,
): ConfigService<EnvConfig, true> {
  return { get: (key: keyof EnvConfig) => values[key] } as unknown as ConfigService<
    EnvConfig,
    true
  >;
}

const gmail = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: 587,
  SMTP_USER: 'loja@gmail.com',
};

describe('createEmailSender', () => {
  it('Gmail configurado mas sem senha de app ainda: fica no console (não tenta e falha)', () => {
    expect(createEmailSender(fakeConfig(gmail))).toBeInstanceOf(ConsoleEmailSender);
  });

  it('Gmail com senha de app: envia por SMTP', () => {
    expect(
      createEmailSender(fakeConfig({ ...gmail, SMTP_PASS: 'abcd efgh ijkl mnop' })),
    ).toBeInstanceOf(SmtpEmailSender);
  });

  it('Resend tem prioridade quando configurado', () => {
    expect(
      createEmailSender(fakeConfig({ ...gmail, SMTP_PASS: 'x', RESEND_API_KEY: 're_123' })),
    ).toBeInstanceOf(ResendEmailSender);
  });
});
