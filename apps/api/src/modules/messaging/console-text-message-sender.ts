import { Injectable, Logger } from '@nestjs/common';
import { maskBrazilianMobile } from './phone';
import { TextMessageSender, type SendTextMessageParams } from './text-message-sender';

/**
 * Fallback sem Twilio configurado — nunca envia, só registra no log da API
 * (em dev, é onde aparece o código de redefinição de senha pra testar o
 * fluxo). Número mascarado no log: log não é lugar de dado pessoal inteiro.
 */
@Injectable()
export class ConsoleTextMessageSender extends TextMessageSender {
  private readonly logger = new Logger(ConsoleTextMessageSender.name);

  /** `revealContent: false` em produção — o texto pode ser um código de redefinição de senha. */
  constructor(private readonly revealContent = true) {
    super();
  }

  async send(params: SendTextMessageParams): Promise<void> {
    const content = this.revealContent
      ? ` Conteúdo: ${params.body}`
      : ' (conteúdo omitido em produção)';
    this.logger.warn(
      `Nenhum provedor de SMS configurado (TWILIO_*) — mensagem para ${maskBrazilianMobile(params.to)} não foi enviada de verdade.${content}`,
    );
  }
}
