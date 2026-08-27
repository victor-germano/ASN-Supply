'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import { resetPasswordAction } from '@/actions/auth';
import { useInvalidateCurrentUser } from '@/hooks/useCurrentUser';

interface ResetPasswordFormValues {
  newPassword: string;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const invalidateCurrentUser = useInvalidateCurrentUser();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ mode: 'onBlur' });

  if (!token) {
    return (
      <Text size="sm" className="text-center text-error" role="alert">
        Link inválido. Peça um novo link em{' '}
        <Link href="/esqueci-senha" className="underline underline-offset-4">
          Esqueci minha senha
        </Link>
        .
      </Text>
    );
  }

  async function onSubmit(values: ResetPasswordFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await resetPasswordAction(token!, values.newPassword);
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
        <label className={labelClassName} htmlFor="newPassword">
          Nova senha
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          className={inputClassName}
          {...register('newPassword', {
            required: 'Crie uma nova senha.',
            minLength: { value: 8, message: 'A senha deve ter ao menos 8 caracteres.' },
          })}
        />
        <FieldErrorText error={errors.newPassword} />
      </div>

      {submitError && (
        <Text size="sm" className="text-error" role="alert">
          {submitError}
        </Text>
      )}

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
        Redefinir senha
      </Button>
    </form>
  );
}
