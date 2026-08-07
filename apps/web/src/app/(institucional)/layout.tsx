import { Container } from '@asn/ui';

/**
 * Layout compartilhado pelas páginas institucionais (FAQ, trocas, política
 * de privacidade, termos de uso) — largura de leitura confortável e
 * espaçamento consistente entre elas, sem repetir o wrapper em cada page.tsx.
 */
export default function InstitutionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-bone-100">
      <Container className="max-w-3xl py-section" disableGutter={false}>
        {children}
      </Container>
    </main>
  );
}
