import Script from 'next/script';

/**
 * Plausible — escolhido por ser privacy-friendly (sem cookie, sem banner
 * de consentimento necessário no Brasil/LGPD) e não exigir SDK nenhum, só
 * este script. Sem `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` configurado, não
 * renderiza nada — nem em produção o site tenta falar com um domínio que
 * não existe. Troca de provedor (GA4, PostHog etc.) é só trocar este
 * componente; nada mais no app depende de qual é.
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
