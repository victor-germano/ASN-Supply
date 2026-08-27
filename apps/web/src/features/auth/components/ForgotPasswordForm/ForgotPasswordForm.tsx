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
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ mode: 'onBlur' });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsSubmitting(true);
    try {
      await forgotPasswordAction(values.email);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <Text size="sm" className="text-center">
        Se esse e-mail estiver cadastrado, você vai receber um link para redefinir sua senha em
        instantes.
      </Text>
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
          {...register('email', { required: 'Informe seu e-mail.' })}
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
