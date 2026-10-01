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
  confirmPassword: string;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const invalidateCurrentUser = useInvalidateCurrentUser();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
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
      router.push(result.redirectTo);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const passwordInputType = showPassword ? 'text' : 'password';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div>
        <label className={labelClassName} htmlFor="newPassword">
          Nova senha
        </label>
        <input
          id="newPassword"
          type={passwordInputType}
          autoComplete="new-password"
          className={inputClassName}
          {...register('newPassword', {
            required: 'Crie uma nova senha.',
            minLength: { value: 8, message: 'A senha deve ter ao menos 8 caracteres.' },
            // Mesmo teto da API (bcrypt ignora tudo depois de 72 bytes).
            maxLength: { value: 72, message: 'A senha pode ter no máximo 72 caracteres.' },
          })}
        />
        <FieldErrorText error={errors.newPassword} />
      </div>

      <div>
        <label className={labelClassName} htmlFor="confirmPassword">
          Confirme a nova senha
        </label>
        <input
          id="confirmPassword"
          type={passwordInputType}
          autoComplete="new-password"
          className={inputClassName}
          {...register('confirmPassword', {
            required: 'Repita a nova senha.',
            validate: (value) => value === getValues('newPassword') || 'As senhas não coincidem.',
          })}
        />
        <FieldErrorText error={errors.confirmPassword} />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(event) => setShowPassword(event.target.checked)}
        />
        Mostrar senha
      </label>

      {submitError && (
        <Text size="sm" className="text-error" role="alert">
          {submitError}{' '}
          <Link href="/esqueci-senha" className="underline underline-offset-4">
            Pedir um novo link
          </Link>
        </Text>
      )}

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
        Redefinir senha
      </Button>

      <Text size="sm" tone="muted" className="text-center">
        Ao redefinir, você será desconectado dos outros aparelhos.
      </Text>
    </form>
  );
}
