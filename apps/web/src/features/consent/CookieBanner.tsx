'use client';

import Link from 'next/link';
import { Button } from '@asn/ui';

/**
 * Aviso de cookies no rodapé da tela. Não bloqueia a navegação, e
 * "Rejeitar opcionais" tem o mesmo peso visual de "Aceitar todos" — sem
 * empurrar a pessoa para um lado (orientação da ANPD).
 */
export function CookieBanner({
  onAcceptAll,
  onRejectOptional,
  onCustomize,
}: {
  onAcceptAll: () => void;
  onRejectOptional: () => void;
  onCustomize: () => void;
}) {
  return (
    <section
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/10 bg-bone-50 px-4 py-5 shadow-[0_-8px_30px_rgba(22,22,15,0.08)] sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl text-sm text-ink">
          <p className="mb-1 font-medium">Sua privacidade importa para a ASN Supply</p>
          <p className="text-ink-muted">
            Usamos cookies essenciais para manter você conectado e guardar seu carrinho. Com a sua
            permissão, também medimos visitas de forma anônima para melhorar a loja. Não usamos
            cookies de publicidade nem vendemos seus dados.{' '}
            <Link href="/politica-de-cookies" className="text-ink underline underline-offset-4">
              Política de Cookies
            </Link>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="button" variant="secondary" size="md" onClick={onRejectOptional}>
            Rejeitar opcionais
          </Button>
          <Button type="button" size="md" onClick={onAcceptAll}>
            Aceitar todos
          </Button>
          <button
            type="button"
            onClick={onCustomize}
            className="px-2 py-2 text-sm text-ink underline underline-offset-4"
          >
            Personalizar
          </button>
        </div>
      </div>
    </section>
  );
}
