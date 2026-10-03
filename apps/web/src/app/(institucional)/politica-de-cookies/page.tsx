import type { Metadata } from 'next';
import { Heading, Text } from '@asn/ui';
import { STORE_CONTACT_EMAIL } from '@/lib/storeInfo';
import { CookiePreferencesButton } from '@/features/consent/CookiePreferencesButton';

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description:
    'Quais cookies e dados a ASN Supply guarda no seu navegador, para quê e por quanto tempo.',
};

interface StorageItem {
  name: string;
  purpose: string;
  duration: string;
  kind: string;
}

/**
 * Lista do que o site REALMENTE guarda — manter em sincronia com o código
 * (`lib/authCookies.ts`, `lib/consent.ts`, `stores/*`, `components/Analytics`).
 * Item novo no navegador = linha nova aqui (e, se for opcional, versão
 * nova em `CONSENT_VERSION` pra perguntar de novo a todo mundo).
 */
const ESSENTIAL: StorageItem[] = [
  {
    name: 'asn_at',
    purpose: 'Mantém você conectado à sua conta com segurança (não pode ser lido por scripts).',
    duration: '15 minutos',
    kind: 'Cookie',
  },
  {
    name: 'asn_rt',
    purpose: 'Renova sua sessão sem pedir login a cada 15 minutos (não pode ser lido por scripts).',
    duration: '30 dias',
    kind: 'Cookie',
  },
  {
    name: 'asn_consent',
    purpose: 'Guarda a sua escolha sobre cookies, para não perguntarmos de novo a cada visita.',
    duration: '6 meses',
    kind: 'Cookie',
  },
  {
    name: 'asn-cart',
    purpose: 'Guarda os produtos do seu carrinho.',
    duration: 'Até você limpar o carrinho ou sair da conta',
    kind: 'Armazenamento local',
  },
  {
    name: 'asn-wishlist',
    purpose: 'Guarda seus favoritos.',
    duration: 'Até você removê-los',
    kind: 'Armazenamento local',
  },
  {
    name: 'asn-recently-viewed',
    purpose: 'Mostra os produtos que você viu recentemente.',
    duration: 'Até você limpar os dados do navegador',
    kind: 'Armazenamento local',
  },
  {
    name: 'asn-compare',
    purpose: 'Guarda os produtos escolhidos para comparar.',
    duration: 'Até você removê-los',
    kind: 'Armazenamento local',
  },
];

const OPTIONAL: StorageItem[] = [
  {
    name: 'Plausible Analytics',
    purpose:
      'Conta visitas e páginas mais vistas de forma anônima e agregada. Não usa cookies, não identifica você e não acompanha você em outros sites.',
    duration: 'Não guarda nada no seu navegador',
    kind: 'Estatística (só com sua permissão)',
  },
];

function StorageTable({ items }: { items: StorageItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-ink/15 text-xs uppercase tracking-wider text-ink-muted">
            <th className="py-2 pr-4 font-medium">Nome</th>
            <th className="py-2 pr-4 font-medium">Para que serve</th>
            <th className="py-2 pr-4 font-medium">Duração</th>
            <th className="py-2 font-medium">Tipo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.name} className="border-b border-ink/10 align-top">
              <td className="py-3 pr-4 font-mono text-xs text-ink">{item.name}</td>
              <td className="py-3 pr-4 text-ink-muted">{item.purpose}</td>
              <td className="py-3 pr-4 text-ink-muted">{item.duration}</td>
              <td className="py-3 text-ink-muted">{item.kind}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiePolicyPage() {
  return (
    <article className="flex flex-col gap-8">
      <div>
        <Heading as="h1" size="xl" className="mb-2">
          Política de Cookies
        </Heading>
        <Text size="sm" tone="muted">
          Última atualização: 3 de outubro de 2026
        </Text>
      </div>

      <Text tone="muted">
        Cookies e armazenamento local são pequenos dados que o site guarda no seu navegador. Esta
        página lista tudo o que a ASN Supply guarda, para que serve e por quanto tempo — sem letras
        miúdas. Em resumo: usamos o mínimo necessário para a loja funcionar e, só se você permitir,
        uma estatística anônima de visitas. Não usamos cookies de publicidade, não exibimos anúncios
        de terceiros e não vendemos seus dados.
      </Text>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          1. Essenciais (sempre ativos)
        </Heading>
        <Text tone="muted">
          Necessários para o login, o carrinho e a sua própria escolha de cookies. Pela LGPD, não
          dependem de consentimento porque o site não funciona sem eles.
        </Text>
        <StorageTable items={ESSENTIAL} />
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          2. Estatísticas de visita (opcional)
        </Heading>
        <Text tone="muted">
          Só são carregadas se você aceitar. Recusar não muda nada na sua experiência de compra.
        </Text>
        <StorageTable items={OPTIONAL} />
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          3. Publicidade
        </Heading>
        <Text tone="muted">
          Não usamos. Nenhum cookie de anúncios, pixel de redes sociais ou rastreamento entre sites.
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          4. Como mudar sua escolha
        </Heading>
        <Text tone="muted">
          Você pode rever sua escolha a qualquer momento — ela vale por 6 meses, e depois disso
          perguntamos de novo. Também é possível apagar os cookies pelas configurações do seu
          navegador (nesse caso, você sairá da sua conta e o carrinho será esvaziado).
        </Text>
        <div>
          <CookiePreferencesButton className="border border-ink px-5 py-2.5 text-sm text-ink hover:bg-ink hover:text-bone-50" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="sm" weight="semibold">
          5. Contato
        </Heading>
        <Text tone="muted">
          Dúvidas sobre cookies ou sobre seus dados: {STORE_CONTACT_EMAIL}. Veja também nossa
          Política de Privacidade.
        </Text>
      </section>
    </article>
  );
}
