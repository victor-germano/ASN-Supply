'use client';

import Script from 'next/script';
import { useConsent } from '@/features/consent/ConsentProvider';

/**
 * Plausible — privacy-friendly (sem cookie, sem identificar ninguém) e sem
 * SDK, só este script. Mesmo assim só carrega com consentimento explícito
 * na categoria "Estatísticas de visita" (ver `ConsentProvider`): a loja
 * promete no banner que mede visitas "com a sua permissão", e cumpre.
 * Sem `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, não renderiza nada em caso algum.
 */
export function Analytics() {
  const { consent } = useConsent();
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain || !consent?.analytics) return null;

  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
