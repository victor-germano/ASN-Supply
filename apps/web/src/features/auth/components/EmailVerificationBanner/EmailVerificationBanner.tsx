'use client';

import { useState } from 'react';
import { Text } from '@asn/ui';
import { resendVerificationAction } from '@/actions/auth';

export function EmailVerificationBanner() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleResend() {
    setStatus('sending');
    const result = await resendVerificationAction();
    setStatus(result.success ? 'sent' : 'error');
  }

  return (
    <div className="mb-8 flex flex-col items-start gap-2 border border-olive-500/40 bg-olive-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <Text size="sm">
        {status === 'sent'
          ? 'E-mail de confirmação reenviado — confira sua caixa de entrada.'
          : 'Confirme seu e-mail para garantir o acesso total à sua conta.'}
      </Text>
      {status !== 'sent' && (
        <button
          type="button"
          onClick={handleResend}
          disabled={status === 'sending'}
          className="shrink-0 text-sm text-ink underline underline-offset-4 disabled:opacity-50"
        >
          {status === 'sending' ? 'Enviando...' : 'Reenviar e-mail'}
        </button>
      )}
      {status === 'error' && (
        <Text size="xs" className="text-error">
          Não foi possível reenviar agora. Tente de novo em instantes.
        </Text>
      )}
    </div>
  );
}
