'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Text, buttonStyles } from '@asn/ui';
import { verifyEmailAction } from '@/actions/auth';
import { useInvalidateCurrentUser } from '@/hooks/useCurrentUser';

type Status = 'verifying' | 'success' | 'error';

export function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const invalidateCurrentUser = useInvalidateCurrentUser();
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!token || hasRun.current) return;
    hasRun.current = true;
    verifyEmailAction(token).then((result) => {
      if (result.success) {
        invalidateCurrentUser();
        setStatus('success');
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    });
  }, [token, invalidateCurrentUser]);

  if (status === 'verifying') {
    return <Text tone="muted">Confirmando seu e-mail...</Text>;
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <Text>Seu e-mail foi confirmado com sucesso.</Text>
        <Link href="/conta/pedidos" className={buttonStyles({ size: 'md' })}>
          Ir para minha conta
        </Link>
      </div>
    );
  }

  return (
    <Text className="text-center text-error" role="alert">
      {message ?? 'Link inválido ou já expirado.'}
    </Text>
  );
}
