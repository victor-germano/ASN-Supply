import type { Metadata } from 'next';
import { Heading, Text } from '@asn/ui';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos e condições de uso do site e da loja ASN Supply.',
};

export default function TermsOfUsePage() {
  return (
    <article className="flex flex-col gap-8">
      <div>
        <Heading as="h1" size="xl" className="mb-2">
          Termos de Uso
        </Heading>
        <Text size="sm" tone="muted">
          Última atualização: 6 de agosto de 2026
        </Text>
      </div>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          1. Aceitação dos termos
        </Heading>
        <Text tone="muted">
          Ao acessar e utilizar o site da ASN Supply, você concorda com estes Termos de Uso e com
          nossa Política de Privacidade. Caso não concorde, pedimos que não utilize o site.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          2. Cadastro e conta
        </Heading>
        <Text tone="muted">
          Você é responsável por manter a confidencialidade das credenciais da sua conta e por todas
          as atividades realizadas nela. Informações de cadastro devem ser verdadeiras, completas e
          mantidas atualizadas.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          3. Preços e disponibilidade
        </Heading>
        <Text tone="muted">
          Preços e disponibilidade de produtos estão sujeitos a alteração sem aviso prévio. Em caso
          de erro evidente de precificação, a ASN Supply reserva-se o direito de cancelar o pedido,
          com reembolso integral.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          4. Propriedade intelectual
        </Heading>
        <Text tone="muted">
          Todo o conteúdo do site — textos, imagens, layout, identidade visual — é de propriedade da
          ASN Supply ou de seus licenciadores, protegido por leis de direitos autorais e propriedade
          industrial. Reprodução sem autorização prévia é proibida.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          5. Limitação de responsabilidade
        </Heading>
        <Text tone="muted">
          A ASN Supply não se responsabiliza por atrasos causados por transportadoras terceiras,
          eventos fora de nosso controle razoável, ou uso indevido do site por terceiros.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          6. Foro
        </Heading>
        <Text tone="muted">
          Estes termos são regidos pela legislação brasileira. Fica eleito o foro do domicílio do
          consumidor para dirimir eventuais controvérsias, conforme o Código de Defesa do
          Consumidor.
        </Text>
      </section>
    </article>
  );
}
