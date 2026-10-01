'use client';

import { useState } from 'react';
import { Button } from '@asn/ui';
import { inputClassName } from '@/components/form/formStyles';

/**
 * No celular quase ninguém lê o QR (ele está na própria tela) — o caminho
 * real é copiar e colar no app do banco. O campo fica visível e
 * selecionável como plano B pra quando a API de clipboard não está
 * disponível (navegador antigo, contexto sem HTTPS).
 */
export function CopyPixCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <input
        readOnly
        value={code}
        aria-label="Código PIX copia e cola"
        onFocus={(event) => event.currentTarget.select()}
        className={inputClassName + ' text-xs'}
      />
      <Button type="button" fullWidth onClick={handleCopy}>
        {copied ? 'Código copiado!' : 'Copiar código PIX'}
      </Button>
    </div>
  );
}
