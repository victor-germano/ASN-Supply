import type { Metadata } from 'next';
import { Heading, Text } from '@asn/ui';

export const metadata: Metadata = {
  title: 'Perguntas Frequentes',
  description:
    'Tire suas dúvidas sobre pedidos, entrega, trocas e formas de pagamento na ASN Supply.',
};

const FAQ_ITEMS = [
  {
    question: 'Quanto tempo leva para meu pedido chegar?',
    answer:
      'O prazo varia conforme a região: capitais e regiões metropolitanas costumam receber em 3 a 7 dias úteis após a confirmação do pagamento; demais localidades, em até 12 dias úteis. O prazo exato é calculado no checkout a partir do seu CEP.',
  },
  {
    question: 'Quais formas de pagamento vocês aceitam?',
    answer:
      'O pagamento online (cartão de crédito e PIX via gateway certificado) chega em breve. Por enquanto, ao confirmar o pedido no checkout ele fica registrado e aguardando — avisamos os próximos passos por e-mail assim que o pagamento estiver disponível.',
  },
  {
    question: 'Como funciona a troca de tamanho?',
    answer:
      'Você tem até 30 dias corridos após o recebimento para solicitar troca de numeração, sem custo adicional no frete de reenvio. Por enquanto, a solicitação é feita pelo contato@asnsupply.com informando o número do pedido — a área do cliente para acompanhar isso online está a caminho.',
  },
  {
    question: 'Posso devolver um produto e ser reembolsado?',
    answer:
      'Sim. Conforme o Código de Defesa do Consumidor, você tem até 7 dias corridos após o recebimento para desistir da compra, sem necessidade de justificativa. O reembolso é processado no mesmo método de pagamento usado na compra.',
  },
  {
    question: 'Como sei qual o meu tamanho ideal?',
    answer:
      'Cada página de produto traz uma tabela de medidas específica do modelo. Em caso de dúvida entre dois tamanhos, recomendamos o maior — a troca de numeração é gratuita dentro do prazo de 30 dias.',
  },
  {
    question: 'Os produtos têm garantia?',
    answer:
      'Todos os produtos têm garantia contra defeitos de fabricação por 90 dias após o recebimento, além da garantia legal prevista em lei.',
  },
];

export default function FaqPage() {
  return (
    <>
      <Heading as="h1" size="xl" className="mb-10">
        Perguntas Frequentes
      </Heading>
      <dl className="divide-y divide-ink/10">
        {FAQ_ITEMS.map((item) => (
          <div key={item.question} className="py-6">
            <dt>
              <Heading as="h2" size="sm" weight="semibold" className="mb-2">
                {item.question}
              </Heading>
            </dt>
            <dd>
              <Text tone="muted">{item.answer}</Text>
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
