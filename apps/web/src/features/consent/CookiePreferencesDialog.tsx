'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Heading } from '@asn/ui';

const switchClassName =
  "relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-ink/20 transition-colors before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow before:transition-transform before:content-[''] checked:bg-olive-600 checked:before:translate-x-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Preferências por categoria. Mostra só categorias que existem de verdade
 * no site — "publicidade" aparece como informação (não usamos), não como
 * chave enganosa. Esc fecha; foco vai para a janela ao abrir.
 */
export function CookiePreferencesDialog({
  initialAnalytics,
  onSave,
  onClose,
}: {
  initialAnalytics: boolean;
  onSave: (choice: { analytics: boolean }) => void;
  onClose: () => void;
}) {
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto bg-bone-50 p-6 outline-none sm:p-8"
      >
        <Heading as="h2" size="sm" id={titleId} className="mb-2">
          Preferências de cookies
        </Heading>
        <p className="mb-6 text-sm text-ink-muted">
          Escolha o que a ASN Supply pode usar no seu navegador. Você pode mudar isso a qualquer
          momento pelo link no rodapé.
        </p>

        <ul className="flex flex-col divide-y divide-ink/10 border-y border-ink/10">
          <li className="flex items-start justify-between gap-6 py-4">
            <div>
              <p className="text-sm font-medium text-ink">Essenciais</p>
              <p className="mt-1 text-sm text-ink-muted">
                Mantêm você conectado, guardam carrinho, favoritos e sua escolha de cookies. Sem
                eles a loja não funciona — por isso ficam sempre ativos.
              </p>
            </div>
            <input
              type="checkbox"
              role="switch"
              aria-label="Cookies essenciais (sempre ativos)"
              checked
              disabled
              readOnly
              className={switchClassName}
            />
          </li>
          <li className="flex items-start justify-between gap-6 py-4">
            <label htmlFor="consent-analytics">
              <span className="block text-sm font-medium text-ink">Estatísticas de visita</span>
              <span className="mt-1 block text-sm text-ink-muted">
                Contagem anônima de visitas e páginas mais vistas (Plausible), sem cookies de
                rastreamento e sem identificar você.
              </span>
            </label>
            <input
              id="consent-analytics"
              type="checkbox"
              role="switch"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
              className={switchClassName}
            />
          </li>
          <li className="py-4">
            <p className="text-sm font-medium text-ink">Publicidade</p>
            <p className="mt-1 text-sm text-ink-muted">
              Não usamos. A ASN Supply não exibe anúncios de terceiros nem compartilha sua navegação
              com redes de publicidade.
            </p>
          </li>
        </ul>

        <p className="mt-4 text-xs text-ink-muted">
          Detalhes de cada item em nossa{' '}
          <Link
            href="/politica-de-cookies"
            className="underline underline-offset-4"
            onClick={onClose}
          >
            Política de Cookies
          </Link>
          .
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onSave({ analytics })}>
            Salvar preferências
          </Button>
        </div>
      </div>
    </div>
  );
}
