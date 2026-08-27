'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import { registerAction } from '@/actions/auth';
import { useInvalidateCurrentUser } from '@/hooks/useCurrentUser';

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
}

export function RegisterForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const invalidateCurrentUser = useInvalidateCurrentUser();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ mode: 'onBlur' });

  async function onSubmit(values: RegisterFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await registerAction(values);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      invalidateCurrentUser();
      router.push('/conta/pedidos');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div>
        <label className={labelClassName} htmlFor="name">
          Nome
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          className={inputClassName}
          {...register('name', {
            required: 'Informe seu nome.',
            minLength: { value: 2, message: 'Nome muito curto.' },
          })}
        />
        <FieldErrorText error={errors.name} />
      </div>

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

      <div>
        <label className={labelClassName} htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className={inputClassName}
          {...register('password', {
            required: 'Crie uma senha.',
            minLength: { value: 8, message: 'A senha deve ter ao menos 8 caracteres.' },
          })}
        />
        <FieldErrorText error={errors.password} />
      </div>

      {submitError && (
        <Text size="sm" className="text-error" role="alert">
          {submitError}
        </Text>
      )}

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
        Criar conta
      </Button>

      <Text size="sm" tone="muted" className="text-center">
        Já tem conta?{' '}
        <Link href="/entrar" className="text-ink underline underline-offset-4">
          Entrar
        </Link>
      </Text>
    </form>
  );
}
