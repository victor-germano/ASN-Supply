import { Container, Section, Text } from '@asn/ui';
import { CreditCardIcon, RefreshIcon, ShieldIcon, TruckIcon } from '@/components/icons';
import { RevealOnScroll } from '@/components/motion/RevealOnScroll';

const BENEFITS = [
  {
    icon: TruckIcon,
    title: 'Frete grátis acima de R$ 500',
    description: 'Para todo o Brasil, em compras a partir de R$ 500.',
  },
  {
    icon: RefreshIcon,
    title: 'Troca facilitada em 30 dias',
    description: 'Numeração errada? Trocamos sem custo adicional.',
  },
  {
    icon: CreditCardIcon,
    title: 'Até 12x sem juros',
    description: 'No cartão, ou à vista com desconto via PIX.',
  },
  {
    icon: ShieldIcon,
    title: 'Compra 100% segura',
    description: 'Pagamento processado por gateways certificados PCI-DSS.',
  },
];

export function Benefits() {
  return (
    <Section spacing="compact" className="bg-bone-50">
      <Container>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit, index) => (
            <RevealOnScroll
              key={benefit.title}
              delay={index * 0.06}
              className="flex flex-col items-center gap-3 text-center"
            >
              <benefit.icon className="h-7 w-7 text-olive-600" />
              <Text weight="medium">{benefit.title}</Text>
              <Text size="sm" tone="muted">
                {benefit.description}
              </Text>
            </RevealOnScroll>
          ))}
        </div>
      </Container>
    </Section>
  );
}
