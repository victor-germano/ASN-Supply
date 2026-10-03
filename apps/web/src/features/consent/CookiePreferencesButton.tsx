'use client';

import { useConsent } from './ConsentProvider';

/** "Preferências de cookies" — reabre a escolha a qualquer momento (rodapé, Política de Cookies). */
export function CookiePreferencesButton({ className }: { className?: string }) {
  const { openPreferences } = useConsent();
  return (
    <button type="button" onClick={openPreferences} className={className}>
      Preferências de cookies
    </button>
  );
}
