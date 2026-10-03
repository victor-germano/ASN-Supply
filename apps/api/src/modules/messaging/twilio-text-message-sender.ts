import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { maskBrazilianMobile } from './phone';
import { TextMessageSender, type SendTextMessageParams } from './text-message-sender';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  /**
   * Remetente: número Twilio em E.164 pra SMS, ou `whatsapp:+55...` pra
   * enviar pelo WhatsApp Business (mesma API — o destino recebe o mesmo
   * prefixo automaticamente).
   */
  from: string;
}

/**
 * Adapter real via API REST da Twilio (sem SDK — é um único POST
 * form-encoded com Basic Auth). Ativo quando `TWILIO_ACCOUNT_SID`,
 * `TWILIO_AUTH_TOKEN` e `TWILIO_FROM` existem (ver `messaging.module.ts`).
 */
@Injectable()
export class TwilioTextMessageSender extends TextMessageSender {
  private readonly logger = new Logger(TwilioTextMessageSender.name);

  constructor(
    private readonly config: TwilioConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    super();
  }

  async send(params: SendTextMessageParams): Promise<void> {
    const viaWhatsApp = this.config.from.startsWith('whatsapp:');
    const body = new URLSearchParams({
      From: this.config.from,
      To: viaWhatsApp ? `whatsapp:${params.to}` : params.to,
      Body: params.body,
    });
    const credentials = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString(
      'base64',
    );

    const response = await this.fetchImpl(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.config.accountSid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(
        `Twilio recusou a mensagem para ${maskBrazilianMobile(params.to)} (HTTP ${response.status}): ${detail.slice(0, 300)}`,
      );
      throw new InternalServerErrorException({
        errorCode: 'TEXT_MESSAGE_SEND_FAILED',
        message: 'Não foi possível enviar a mensagem agora.',
      });
    }
  }
}
