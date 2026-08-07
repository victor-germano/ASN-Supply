import Link from 'next/link';
import { Container, Text } from '@asn/ui';
import { InstagramIcon } from '@/components/icons';

const INSTITUTIONAL_LINKS = [
  { label: 'Sobre a marca', href: '/#sobre' },
  { label: 'Perguntas Frequentes', href: '/perguntas-frequentes' },
  { label: 'Trocas e Devoluções', href: '/trocas-e-devolucoes' },
  { label: 'Política de Privacidade', href: '/politica-de-privacidade' },
  { label: 'Termos de Uso', href: '/termos-de-uso' },
];

const PAYMENT_METHODS = ['Visa', 'Mastercard', 'Pix'];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-ink/10 bg-bone-50">
      <Container className="grid grid-cols-1 gap-12 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <span className="font-display text-2xl text-ink">ASN SUPPLY</span>
          <Text size="sm" tone="muted" className="max-w-xs">
            Curadoria de tênis premium e edições exclusivas — estilo que não segue tendência, define
            uma.
          </Text>
          <a
            href="https://instagram.com/asnsupply"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="ASN Supply no Instagram"
            className="mt-2 flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:border-ink hover:text-olive-600"
          >
            <InstagramIcon className="h-4 w-4" />
          </a>
        </div>

        <nav aria-label="Institucional">
          <Text size="sm" weight="semibold" className="mb-4 uppercase tracking-wider">
            Institucional
          </Text>
          <ul className="flex flex-col gap-3">
            {INSTITUTIONAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-muted hover:text-ink">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <Text size="sm" weight="semibold" className="mb-4 uppercase tracking-wider">
            Atendimento
          </Text>
          <ul className="flex flex-col gap-3 text-sm text-ink-muted">
            <li>
              <a href="mailto:contato@asnsupply.com" className="hover:text-ink">
                contato@asnsupply.com
              </a>
            </li>
            <li>Seg. a sex., 9h às 18h</li>
          </ul>
        </div>

        <div>
          <Text size="sm" weight="semibold" className="mb-4 uppercase tracking-wider">
            Pagamento
          </Text>
          <ul className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => (
              <li
                key={method}
                className="rounded border border-ink/15 px-2.5 py-1 text-xs text-ink-muted"
              >
                {method}
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="border-t border-ink/10">
        <Container className="flex flex-col items-center justify-between gap-2 py-6 text-xs text-ink-muted sm:flex-row">
          <span>© {currentYear} ASN Supply. Todos os direitos reservados.</span>
          <span>CNPJ 00.000.000/0001-00</span>
        </Container>
      </div>
    </footer>
  );
}
