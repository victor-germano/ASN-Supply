import type { Metadata } from 'next';
import { Heading, Text } from '@asn/ui';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Como a ASN Supply coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.',
};

export default function PrivacyPolicyPage() {
  return (
    <article className="flex flex-col gap-8">
      <div>
        <Heading as="h1" size="xl" className="mb-2">
          Política de Privacidade
        </Heading>
        <Text size="sm" tone="muted">
          Última atualização: 6 de agosto de 2026
        </Text>
      </div>

      <Text tone="muted">
        Esta política descreve como a ASN Supply coleta, usa, armazena e protege dados pessoais de
        clientes e visitantes, em conformidade com a Lei Geral de Proteção de Dados (Lei nº
        13.709/2018 — LGPD).
      </Text>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          1. Dados que coletamos
        </Heading>
        <Text tone="muted">
          Coletamos dados fornecidos diretamente por você (nome, e-mail, telefone, endereço, dados
          de pagamento tokenizados) e dados coletados automaticamente durante a navegação (endereço
          IP, dispositivo, páginas visitadas, produtos visualizados), usados para personalizar sua
          experiência de compra.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          2. Como usamos seus dados
        </Heading>
        <Text tone="muted">
          Usamos seus dados para processar pedidos, calcular frete, prevenir fraude, enviar
          comunicações transacionais (confirmação de pedido, status de entrega) e, mediante seu
          consentimento explícito, comunicações de marketing como a newsletter.
        </Text>
        <Text tone="muted">
          Seu celular é usado para enviar códigos de segurança por SMS, como o de redefinição de
          senha, sempre que você solicitar. Se você autorizar no cadastro (a opção vem desmarcada),
          também enviamos lembretes por SMS sobre produtos que viu ou deixou no carrinho enquanto
          estava conectado à sua conta: no máximo um por semana, apenas em horário comercial e nunca
          depois de uma compra. Para isso, registramos quais produtos você visualizou e adicionou ao
          carrinho enquanto conectado — visitantes não identificados não são acompanhados. Você pode
          desativar os lembretes a qualquer momento em Minha conta › Preferências.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          3. Compartilhamento com terceiros
        </Heading>
        <Text tone="muted">
          Compartilhamos dados estritamente necessários com transportadoras e provedores de
          infraestrutura (hospedagem, e-mail transacional e envio de SMS) — todos sob obrigações
          contratuais de confidencialidade. O pagamento via PIX é feito diretamente no aplicativo do
          seu banco; não recebemos nem guardamos dados bancários. Não vendemos dados pessoais a
          terceiros.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          4. Seus direitos
        </Heading>
        <Text tone="muted">
          Você pode solicitar a qualquer momento a confirmação, correção, portabilidade ou exclusão
          dos seus dados, bem como revogar consentimentos concedidos, pelo contato@asnsupply.com.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          5. Segurança
        </Heading>
        <Text tone="muted">
          Dados são transmitidos com criptografia TLS e armazenados com controle de acesso restrito.
          Dados de cartão de crédito nunca transitam ou são armazenados por servidores próprios —
          todo o processamento de pagamento ocorre diretamente nos gateways certificados PCI-DSS.
        </Text>
      </section>
    </article>
  );
}
