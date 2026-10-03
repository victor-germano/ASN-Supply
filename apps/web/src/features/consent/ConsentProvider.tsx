'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  CONSENT_VERSION,
  buildConsentCookie,
  readConsentCookie,
  type ConsentState,
} from '@/lib/consent';
import { CookieBanner } from './CookieBanner';
import { CookiePreferencesDialog } from './CookiePreferencesDialog';

interface ConsentContextValue {
  /** `null` = ainda não decidiu. */
  consent: ConsentState | null;
  /** `false` até ler o cookie no navegador — evita piscar o banner pra quem já decidiu. */
  isReady: boolean;
  save: (choice: { analytics: boolean }) => void;
  openPreferences: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function useConsent(): ConsentContextValue {
  const value = useContext(ConsentContext);
  if (!value) throw new Error('useConsent precisa estar dentro de <ConsentProvider>.');
  return value;
}

/**
 * Estado do consentimento de cookies + banner/janela de preferências.
 * Montado uma vez no layout raiz; qualquer ponto do site abre as
 * preferências com `useConsent().openPreferences()` (ex: link do rodapé).
 */
export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  useEffect(() => {
    setConsent(readConsentCookie(document.cookie));
    setIsReady(true);
  }, []);

  const save = useCallback((choice: { analytics: boolean }) => {
    const next: ConsentState = {
      version: CONSENT_VERSION,
      analytics: choice.analytics,
      decidedAt: new Date().toISOString(),
    };
    document.cookie = buildConsentCookie(next, window.location.protocol === 'https:');
    setConsent(next);
    setIsPreferencesOpen(false);
  }, []);

  const openPreferences = useCallback(() => setIsPreferencesOpen(true), []);

  const value = useMemo(
    () => ({ consent, isReady, save, openPreferences }),
    [consent, isReady, save, openPreferences],
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {isReady && !consent && !isPreferencesOpen && (
        <CookieBanner
          onAcceptAll={() => save({ analytics: true })}
          onRejectOptional={() => save({ analytics: false })}
          onCustomize={openPreferences}
        />
      )}
      {isPreferencesOpen && (
        <CookiePreferencesDialog
          initialAnalytics={consent?.analytics ?? false}
          onSave={save}
          onClose={() => setIsPreferencesOpen(false)}
        />
      )}
    </ConsentContext.Provider>
  );
}
