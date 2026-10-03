import type { Metadata } from 'next';
import { STORE_CONTACT_EMAIL } from '@/lib/storeInfo';
import { Heading, Text } from '@asn/ui';

export const metadata: Metadata = {
  title: 'Trocas e Devoluções',
  description: 'Política de trocas e devoluções da ASN Supply.',
};

export default function ExchangesPage() {
  return (
    <article className="flex flex-col gap-8">
      <Heading as="h1" size="xl">
        Trocas e Devoluções
      </Heading>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          Troca de numeração ou cor
        </Heading>
        <Text tone="muted">
          Você tem até 30 dias corridos após o recebimento para solicitar a troca de tamanho ou cor,
          sujeita à disponibilidade em estoque. O frete de reenvio da troca é por nossa conta quando
          a solicitação é feita dentro do prazo. Por enquanto, a solicitação é aberta pelo
          {STORE_CONTACT_EMAIL}, informando o número do pedido — a área do cliente para abrir isso
          online está a caminho.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          Direito de arrependimento (7 dias)
        </Heading>
        <Text tone="muted">
          Conforme o artigo 49 do Código de Defesa do Consumidor, compras realizadas fora do
          estabelecimento comercial podem ser canceladas em até 7 dias corridos após o recebimento,
          sem necessidade de justificativa. O valor total — incluindo frete de ida — é reembolsado
          no método de pagamento original em até 10 dias úteis após recebermos o produto de volta.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          Defeito de fabricação
        </Heading>
        <Text tone="muted">
          Produtos com defeito de fabricação têm garantia de 90 dias após o recebimento. Nesse caso,
          o frete de devolução também é por nossa conta e você pode optar por troca, reembolso ou
          crédito na loja.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          Condições para aceite da devolução
        </Heading>
        <Text tone="muted">
          O produto deve ser devolvido sem uso, com a caixa original e etiquetas intactas. Itens com
          sinais de uso em solado ou palmilha podem ter a troca recusada, exceto em casos de defeito
          de fabricação.
        </Text>
      </section>
    </article>
  );
}
