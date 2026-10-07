import { Injectable, Logger } from '@nestjs/common';
import { EmailSender, type SendEmailParams } from './email-sender';

/**
 * Fallback sem `RESEND_API_KEY` configurada — nunca falha, só loga (em
 * dev, o link de redefinição de senha/verificação aparece no console da
 * API, plenamente utilizável para testar o fluxo sem depender de conta no
 * Resend). Mesmo espírito do `StyleGuideTryOnAnalyzer`/`NullPaymentGateway`:
 * dev/CI continuam funcionando sem a credencial externa.
 */
@Injectable()
export class ConsoleEmailSender extends EmailSender {
  private readonly logger = new Logger(ConsoleEmailSender.name);

  /**
   * `revealContent: false` em produção: o conteúdo traz link de
   * redefinição de senha — quem lesse o log (painel da hospedagem, serviço
   * de logs) poderia entrar na conta do cliente.
   */
  constructor(private readonly revealContent = true) {
    super();
  }

  async send(params: SendEmailParams): Promise<void> {
    const content = this.revealContent
      ? ` Conteúdo:\n${stripHtml(params.html)}`
      : ' (conteúdo omitido em produção)';
    this.logger.warn(
      `Nenhum provedor de e-mail configurado (RESEND_API_KEY/SMTP_HOST) — e-mail para "${params.to}" (${params.subject}) não foi enviado de verdade.${content}`,
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
