import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { EnvConfig } from '../../config/env.validation';
import { EmailSender, type SendEmailParams } from './email-sender';

/**
 * Adapter SMTP — ativo quando `SMTP_HOST` está configurada e
 * `RESEND_API_KEY` não (ver `email.module.ts`). Existe porque a ASN ainda
 * não tem domínio próprio verificado: o Resend sem domínio só entrega para
 * o e-mail do dono da conta, enquanto um Gmail comum com "senha de app"
 * entrega pra qualquer cliente. Remetente cai no próprio `SMTP_USER`
 * quando `EMAIL_FROM` não é setada — o Gmail reescreve (ou rejeita) um
 * `From` que não seja a conta autenticada.
 */
@Injectable()
export class SmtpEmailSender extends EmailSender {
  private readonly logger = new Logger(SmtpEmailSender.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<EnvConfig, true>) {
    super();
    const port = config.get('SMTP_PORT', { infer: true });
    const user = config.get('SMTP_USER', { infer: true });
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port,
      // 465 = TLS direto; 587 = STARTTLS (nodemailer sobe pra TLS sozinho).
      secure: port === 465,
      auth: user ? { user, pass: config.get('SMTP_PASS', { infer: true }) } : undefined,
    });
    this.from = config.get('EMAIL_FROM', { infer: true }) ?? `ASN Supply <${user}>`;
  }

  async send(params: SendEmailParams): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
    } catch (error) {
      this.logger.error(`Falha ao enviar e-mail para "${params.to}": ${error}`);
      throw new InternalServerErrorException({
        errorCode: 'EMAIL_SEND_FAILED',
        message: 'Não foi possível enviar o e-mail agora.',
      });
    }
  }
}
