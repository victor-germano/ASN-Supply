'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import { FormAlert } from '@/components/form/FormAlert';
import { loginAction } from '@/actions/auth';
import { useInvalidateCurrentUser } from '@/hooks/useCurrentUser';
import { isSafeInternalPath } from '@/lib/safeRedirect';
import { SocialLoginButtons } from '../SocialLoginButtons/SocialLoginButtons';

interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginFormProps {
  /** Para onde ir se não houver `?next=` na URL. Página de conta usa o padrão; `/admin/entrar` passa `/admin`. */
  defaultNext?: string;
  /** `/admin/entrar` esconde — criar conta não é uma ação que faça sentido oferecer ali. */
  showCreateAccountLink?: boolean;
}

/**
 * `next` na querystring (setado pelo middleware ao redirecionar de uma rota
 * protegida) leva de volta para onde o usuário estava tentando ir — só
 * aceita caminhos internos (`/...`) para não virar open redirect.
 */
export function LoginForm({
  defaultNext = '/conta/pedidos',
  showCreateAccountLink = true,
}: LoginFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const invalidateCurrentUser = useInvalidateCurrentUser();
  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormValues>({ mode: 'onBlur' });
  const rawNext = searchParams.get('next');
  const resolvedNext = isSafeInternalPath(rawNext) ? rawNext : defaultNext;

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await loginAction(values);
      if (!result.success) {
        setSubmitError(result.message);
        // E-mail fica (o erro mais comum é só a senha); senha some e ganha
        // foco pra pessoa redigitar direto.
        resetField('password');
        setFocus('password');
        return;
      }
      const next = searchParams.get('next');
      invalidateCurrentUser();
      router.push(isSafeInternalPath(next) ? next : defaultNext);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {submitError && (
        <FormAlert tone="error" title="Não foi possível entrar">
          {submitError}{' '}
          <Link href="/esqueci-senha" className="underline underline-offset-4">
            Esqueceu a senha?
          </Link>
        </FormAlert>
      )}

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
        <div className="mb-1.5 flex items-center justify-between">
          <label className={labelClassName + ' mb-0'} htmlFor="password">
            Senha
          </label>
          {/* Sempre visível — inclusive em `/admin/entrar`: a dona da loja
              também precisa de um jeito de recuperar o acesso sozinha. */}
          <Link
            href="/esqueci-senha"
            className="text-xs text-ink-muted underline underline-offset-4"
          >
            Esqueci minha senha
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={inputClassName}
          {...register('password', { required: 'Informe sua senha.' })}
        />
        <FieldErrorText error={errors.password} />
      </div>

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
        Entrar
      </Button>

      {showCreateAccountLink && (
        <Text size="sm" tone="muted" className="text-center">
          Não tem conta?{' '}
          <Link href="/criar-conta" className="text-ink underline underline-offset-4">
            Criar conta
          </Link>
        </Text>
      )}

      <SocialLoginButtons next={resolvedNext} />
    </form>
  );
}
