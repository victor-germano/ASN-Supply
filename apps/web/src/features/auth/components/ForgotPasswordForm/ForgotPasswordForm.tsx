'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PasswordResetChannel } from '@asn/types';
import { Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import { FormAlert } from '@/components/form/FormAlert';
import { forgotPasswordAction, resetPasswordWithCodeAction } from '@/actions/auth';
import { useInvalidateCurrentUser } from '@/hooks/useCurrentUser';

const RESEND_COOLDOWN_SECONDS = 60;

interface RequestValues {
  email: string;
  channel: PasswordResetChannel;
}

type Step =
  { kind: 'request' } | { kind: 'email-sent'; email: string } | { kind: 'sms-code'; email: string };

/**
 * Recuperação de senha por e-mail (link) ou SMS (código de 6 dígitos).
 * As mensagens nunca dizem se o e-mail existe ou se a conta tem celular —
 * "se houver uma conta…" — mesma defesa contra enumeração da API.
 */
export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>({ kind: 'request' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestValues>({ mode: 'onBlur', defaultValues: { channel: 'email' } });

  async function onSubmit(values: RequestValues) {
    setIsSubmitting(true);
    try {
      const email = values.email.trim();
      await forgotPasswordAction(email, values.channel);
      setStep(
        values.channel === 'sms' ? { kind: 'sms-code', email } : { kind: 'email-sent', email },
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step.kind === 'email-sent') {
    return <EmailSent email={step.email} onBack={() => setStep({ kind: 'request' })} />;
  }
  if (step.kind === 'sms-code') {
    return <SmsCodeStep email={step.email} onBack={() => setStep({ kind: 'request' })} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <Text size="sm" tone="muted" className="text-center">
        Informe o e-mail da sua conta e escolha como quer receber as instruções.
      </Text>

      <div>
        <label className={labelClassName} htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={inputClassName}
          aria-invalid={Boolean(errors.email)}
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

      <fieldset>
        <legend className={labelClassName}>Receber por</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChannelOption
            value="email"
            title="E-mail"
            description="Link para criar uma nova senha"
            register={register}
          />
          <ChannelOption
            value="sms"
            title="SMS"
            description="Código de 6 dígitos no celular cadastrado"
            register={register}
          />
        </div>
      </fieldset>

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
        Continuar
      </Button>

      <Text size="sm" tone="muted" className="text-center">
        <Link href="/entrar" className="text-ink underline underline-offset-4">
          Voltar ao login
        </Link>
      </Text>
    </form>
  );
}

function ChannelOption({
  value,
  title,
  description,
  register,
}: {
  value: PasswordResetChannel;
  title: string;
  description: string;
  register: ReturnType<typeof useForm<RequestValues>>['register'];
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 border border-ink/15 p-4 has-[:checked]:border-ink">
      <input type="radio" value={value} className="mt-1" {...register('channel')} />
      <span>
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="block text-xs text-ink-muted">{description}</span>
      </span>
    </label>
  );
}

function EmailSent({ email, onBack }: { email: string; onBack: () => void }) {
  const [isResending, setIsResending] = useState(false);
  return (
    <div className="flex flex-col gap-4 text-center">
      <FormAlert tone="success" title="Verifique seu e-mail">
        Se <strong>{email}</strong> estiver cadastrado, você vai receber um link para redefinir sua
        senha em instantes.
      </FormAlert>
      <Text size="sm" tone="muted">
        O link vale por 30 minutos. Não chegou? Confira a caixa de spam ou lixo eletrônico.
      </Text>
      <Button
        type="button"
        variant="secondary"
        fullWidth
        isLoading={isResending}
        onClick={async () => {
          setIsResending(true);
          await forgotPasswordAction(email, 'email');
          setIsResending(false);
        }}
      >
        Enviar de novo
      </Button>
      <Text size="sm" tone="muted">
        <button type="button" onClick={onBack} className="text-ink underline underline-offset-4">
          Receber por SMS
        </button>
        {' · '}
        <Link href="/entrar" className="text-ink underline underline-offset-4">
          Voltar ao login
        </Link>
      </Text>
    </div>
  );
}

interface CodeValues {
  code: string;
  newPassword: string;
  confirmPassword: string;
}

function SmsCodeStep({ email, onBack }: { email: string; onBack: () => void }) {
  const router = useRouter();
  const invalidateCurrentUser = useInvalidateCurrentUser();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resentNotice, setResentNotice] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<CodeValues>({ mode: 'onBlur' });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function onSubmit(values: CodeValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await resetPasswordWithCodeAction(email, values.code, values.newPassword);
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

  async function resend() {
    setResentNotice(false);
    await forgotPasswordAction(email, 'sms');
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setResentNotice(true);
  }

  const passwordType = showPassword ? 'text' : 'password';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <FormAlert tone="info" title="Confira seu celular">
        Se houver uma conta com celular cadastrado para <strong>{email}</strong>, enviamos um código
        de 6 dígitos por SMS. Ele vale por 10 minutos.
      </FormAlert>

      {submitError && <FormAlert tone="error">{submitError}</FormAlert>}
      {resentNotice && <FormAlert tone="success">Enviamos um novo código.</FormAlert>}

      <div>
        <label className={labelClassName} htmlFor="code">
          Código recebido por SMS
        </label>
        <input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          className={inputClassName + ' tracking-[0.5em]'}
          aria-invalid={Boolean(errors.code)}
          {...register('code', {
            required: 'Digite o código de 6 dígitos.',
            pattern: { value: /^\d{6}$/, message: 'O código tem 6 números.' },
          })}
        />
        <FieldErrorText error={errors.code} />
      </div>

      <div>
        <label className={labelClassName} htmlFor="newPassword">
          Nova senha
        </label>
        <input
          id="newPassword"
          type={passwordType}
          autoComplete="new-password"
          className={inputClassName}
          aria-invalid={Boolean(errors.newPassword)}
          {...register('newPassword', {
            required: 'Crie uma nova senha.',
            minLength: { value: 8, message: 'A senha deve ter ao menos 8 caracteres.' },
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
          type={passwordType}
          autoComplete="new-password"
          className={inputClassName}
          aria-invalid={Boolean(errors.confirmPassword)}
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

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
        Redefinir senha
      </Button>

      <Text size="sm" tone="muted" className="text-center">
        {cooldown > 0 ? (
          <>Reenviar código em {cooldown}s</>
        ) : (
          <button type="button" onClick={resend} className="text-ink underline underline-offset-4">
            Reenviar código
          </button>
        )}
        {' · '}
        <button type="button" onClick={onBack} className="text-ink underline underline-offset-4">
          Receber por e-mail
        </button>
      </Text>
      <Text size="xs" tone="muted" className="text-center">
        Ao redefinir, você será desconectado dos outros aparelhos.
      </Text>
    </form>
  );
}
