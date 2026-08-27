'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * `error.tsx` (raiz de `app/`) não alcança um erro no próprio `layout.tsx`
 * raiz — este arquivo é o único jeito de capturar isso, e por precisar
 * substituir a árvore inteira, tem que renderizar `<html>`/`<body>` do
 * zero (não reaproveita `RootLayout`). Deliberadamente mínimo — sem fontes
 * customizadas, header/footer nem Tailwind: se chegou aqui, algo básico
 * já falhou, então quanto menos esta página depender, melhor a chance de
 * ainda assim renderizar algo legível.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'sans-serif', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Algo deu errado por aqui</h1>
        <p style={{ color: '#6b6a5f' }}>
          Não conseguimos carregar o site agora. Tente novamente em instantes.
        </p>
      </body>
    </html>
  );
}
