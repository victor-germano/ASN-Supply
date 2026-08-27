import { Injectable, Logger } from '@nestjs/common';
import { EmailSender, type SendEmailParams } from './email-sender';

/**
 * Fallback sem `RESEND_API_KEY` configurada — nunca falha, só loga (em
 * dev, o link de redefinição de senha/verificação aparece no console da
 * API, plenamente utilizável para testar o fluxo sem depender de conta no
 * Resend). Mesmo espírito do `MockTryOnAnalyzer`/`NullPaymentGateway`:
 * dev/CI continuam funcionando sem a credencial externa.
 */
@Injectable()
export class ConsoleEmailSender extends EmailSender {
  private readonly logger = new Logger(ConsoleEmailSender.name);

  async send(params: SendEmailParams): Promise<void> {
    this.logger.warn(
      `RESEND_API_KEY não configurada — e-mail para "${params.to}" (${params.subject}) não foi enviado de verdade. Conteúdo:\n${stripHtml(params.html)}`,
    );
  }
}

/**
 * Só pra deixar o log legível — o HTML de verdade nunca é o que interessa
 * aqui, o link clicável sim (é o link que o dev cola no navegador pra
 * testar o fluxo sem precisar de conta no Resend). Troca `<a href="U">T</a>`
 * por `T (U)` ANTES do strip genérico — senão o `href` desapareceria junto
 * com a tag, sobrando só o texto do botão sem a URL nenhuma.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
