/**
 * Textos de SMS. Regras: começar dizendo quem envia (golpe por SMS é
 * comum — o cliente precisa reconhecer a loja), ser curto (com acento,
 * cada 70 caracteres é um SMS cobrado) e, se for promocional, sempre
 * oferecer como parar de receber.
 */

const MAX_PRODUCT_NAME = 40;

export function passwordResetCodeSms(code: string, ttlMinutes: number): string {
  return `ASN Supply: seu código para redefinir a senha é ${code}. Vale por ${ttlMinutes} minutos. Não compartilhe — nunca pedimos este código.`;
}

export interface RecoveryReminderParams {
  firstName: string;
  productName: string;
  /** Item ficou no carrinho (`true`) ou só foi visto (`false`) — muda o texto. */
  inCart: boolean;
  link: string;
  optOutLink: string;
}

export function recoveryReminderSms(params: RecoveryReminderParams): string {
  const product = truncate(params.productName, MAX_PRODUCT_NAME);
  const what = params.inCart
    ? `o ${product} continua no seu carrinho`
    : `o ${product} que você viu continua te esperando`;
  return `Oi, ${params.firstName}! Aqui é a ASN Supply. Sentimos sua falta — ${what}. Quando quiser voltar: ${params.link} · Não quer mais lembretes? ${params.optOutLink}`;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
