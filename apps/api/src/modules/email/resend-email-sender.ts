import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EnvConfig } from '../../config/env.validation';
import { EmailSender, type SendEmailParams } from './email-sender';

/** Adapter real — ativo quando `RESEND_API_KEY` está configurada (ver `email.module.ts`). */
@Injectable()
export class ResendEmailSender extends EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly client: Resend;
  private readonly from: string;

  constructor(config: ConfigService<EnvConfig, true>) {
    super();
    this.client = new Resend(config.get('RESEND_API_KEY', { infer: true }));
    this.from = config.get('EMAIL_FROM', { infer: true });
  }

  async send(params: SendEmailParams): Promise<void> {
    const result = await this.client.emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (result.error) {
      this.logger.error(`Falha ao enviar e-mail para "${params.to}": ${result.error.message}`);
      throw new InternalServerErrorException({
        errorCode: 'EMAIL_SEND_FAILED',
        message: 'Não foi possível enviar o e-mail agora.',
      });
    }
  }
}
