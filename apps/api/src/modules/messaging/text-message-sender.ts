export interface SendTextMessageParams {
  /** Celular em E.164 (`+5511998887766`). */
  to: string;
  body: string;
}

/**
 * Porta de mensagem de texto pro celular (SMS ou WhatsApp, conforme o
 * adapter) — mesmo padrão de `EmailSender`: `TwilioTextMessageSender` de
 * verdade quando há credenciais, `ConsoleTextMessageSender` (loga) sem
 * elas. Nenhum consumidor (código de senha, lembrete) sabe qual está ativo.
 */
export abstract class TextMessageSender {
  abstract send(params: SendTextMessageParams): Promise<void>;
}
