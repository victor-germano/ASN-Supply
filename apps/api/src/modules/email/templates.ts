/**
 * HTML de e-mail com CSS inline (clientes de e-mail em geral ignoram
 * `<style>` externo/`class` — inline é o único jeito confiável). Paleta
 * reaproveitada de `packages/config/tailwind/tokens.js` (ink/olive/bone),
 * sem depender do pacote em runtime (a API não importa Tailwind).
 */
function layout(bodyHtml: string): string {
  return `
    <div style="background-color:#F7F5F0;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background-color:#FDFCFA;border:1px solid #E6E0D4;padding:32px;">
        <p style="font-size:20px;letter-spacing:0.05em;color:#16160F;margin:0 0 24px;">ASN SUPPLY</p>
        ${bodyHtml}
        <p style="font-size:12px;color:#6b6a5f;margin-top:32px;border-top:1px solid #E6E0D4;padding-top:16px;">
          Se você não pediu isto, pode ignorar este e-mail com segurança.
        </p>
      </div>
    </div>
  `;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background-color:#16160F;color:#FDFCFA;padding:12px 24px;text-decoration:none;font-size:14px;margin:16px 0;">${label}</a>`;
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: 'Redefinir sua senha — ASN Supply',
    html: layout(`
      <p style="font-size:15px;color:#16160F;">Recebemos um pedido para redefinir sua senha.</p>
      ${button(resetUrl, 'Redefinir senha')}
      <p style="font-size:13px;color:#6b6a5f;">Este link expira em 30 minutos.</p>
    `),
  };
}

export function emailVerificationEmail(verifyUrl: string): { subject: string; html: string } {
  return {
    subject: 'Confirme seu e-mail — ASN Supply',
    html: layout(`
      <p style="font-size:15px;color:#16160F;">Confirme seu e-mail para concluir seu cadastro.</p>
      ${button(verifyUrl, 'Confirmar e-mail')}
      <p style="font-size:13px;color:#6b6a5f;">Este link expira em 24 horas.</p>
    `),
  };
}

export function orderConfirmationEmail(params: {
  orderCode: string;
  totalLabel: string;
  orderUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Pedido ${params.orderCode} confirmado — ASN Supply`,
    html: layout(`
      <p style="font-size:15px;color:#16160F;">Recebemos seu pedido <strong>${params.orderCode}</strong>.</p>
      <p style="font-size:15px;color:#16160F;">Total: <strong>${params.totalLabel}</strong></p>
      ${button(params.orderUrl, 'Ver pedido')}
    `),
  };
}

export function orderShippedEmail(params: {
  orderCode: string;
  trackingCode: string | null;
  orderUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Pedido ${params.orderCode} a caminho — ASN Supply`,
    html: layout(`
      <p style="font-size:15px;color:#16160F;">Seu pedido <strong>${params.orderCode}</strong> foi enviado.</p>
      ${params.trackingCode ? `<p style="font-size:15px;color:#16160F;">Código de rastreio: <strong>${params.trackingCode}</strong></p>` : ''}
      ${button(params.orderUrl, 'Acompanhar pedido')}
    `),
  };
}
