export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Porta (classe abstrata = token de injeção do Nest) — mesmo padrão de
 * `PaymentGateway`/`TryOnAnalyzer`: um adapter real (`ResendEmailSender`) e
 * um de fallback (`ConsoleEmailSender`), escolhidos em runtime por
 * `email.module.ts` conforme `RESEND_API_KEY` existir ou não. Nenhum
 * consumidor (auth, orders) depende de qual dos dois está ativo.
 */
export abstract class EmailSender {
  abstract send(params: SendEmailParams): Promise<void>;
}
