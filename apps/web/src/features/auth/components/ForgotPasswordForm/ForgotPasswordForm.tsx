'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import { forgotPasswordAction } from '@/actions/auth';

interface ForgotPasswordFormValues {
  email: string;
}

/**
 * Sempre termina em "se esse e-mail existir, você recebe um link" —
 * nunca "e-mail não encontrado" nem "e-mail enviado" (revelaria se a conta
 * existe). Mesma defesa que a API já aplica em `requestPasswordReset`.
 */
export function ForgotPasswordForm() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ mode: 'onBlur' });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsSubmitting(true);
    try {
      await forgotPasswordAction(values.email.trim());
      setSubmittedEmail(values.email.trim());
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedEmail) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <Text size="sm">
          Se <strong>{submittedEmail}</strong> estiver cadastrado, você vai receber um link para
          redefinir sua senha em instantes.
        </Text>
        <Text size="sm" tone="muted">
          O link vale por 30 minutos. Não chegou? Confira a caixa de spam ou lixo eletrônico.
        </Text>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          isLoading={isSubmitting}
          onClick={() => onSubmit({ email: submittedEmail })}
        >
          Enviar de novo
        </Button>
        <Text size="sm" tone="muted">
          <Link href="/entrar" className="text-ink underline underline-offset-4">
            Voltar ao login
          </Link>
        </Text>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div>
        <label className={labelClassName} htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={inputClassName}
          {...register('email', {
            required: 'Informe seu e-mail.',
            // A action engole qualquer erro da API (ver `forgotPasswordAction`)
            // — sem esta checagem, um e-mail digitado errado mostraria a
            // mesma tela de "enviado" sem nunca chegar nada.
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Informe um e-mail válido.' },
          })}
        />
        <FieldErrorText error={errors.email} />
      </div>

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
        Enviar link de redefinição
      </Button>

      <Text size="sm" tone="muted" className="text-center">
        <Link href="/entrar" className="text-ink underline underline-offset-4">
          Voltar ao login
        </Link>
      </Text>
    </form>
  );
}
