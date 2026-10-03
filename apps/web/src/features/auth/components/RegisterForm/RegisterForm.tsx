'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Heading, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import { FormAlert } from '@/components/form/FormAlert';
import { registerAction } from '@/actions/auth';
import { useInvalidateCurrentUser } from '@/hooks/useCurrentUser';
import { isValidBrazilianMobile, lookupCep, maskBrazilianMobile, maskCep } from '@/lib/brazil';
import { SocialLoginButtons } from '../SocialLoginButtons/SocialLoginButtons';

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  marketingOptIn: boolean;
}

type CepStatus = 'idle' | 'loading' | 'found' | 'not-found';

const sectionClassName =
  'flex flex-col gap-5 border-t border-ink/10 pt-6 first:border-t-0 first:pt-0';

/**
 * Cadastro completo: dados pessoais, celular (código de senha por SMS e,
 * se autorizado, lembretes), endereço principal (já fica salvo para o
 * checkout) e consentimentos. O CEP preenche o endereço sozinho pelo
 * ViaCEP; se o serviço falhar, os campos continuam editáveis à mão.
 */
export function RegisterForm() {
  const router = useRouter();
  const invalidateCurrentUser = useInvalidateCurrentUser();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cepStatus, setCepStatus] = useState<CepStatus>('idle');
  const cepRequest = useRef<AbortController | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    mode: 'onBlur',
    defaultValues: { acceptTerms: false, marketingOptIn: false },
  });

  async function handleCepChange(raw: string) {
    const masked = maskCep(raw);
    setValue('zipCode', masked);
    if (masked.length !== 9) {
      setCepStatus('idle');
      return;
    }
    cepRequest.current?.abort();
    const controller = new AbortController();
    cepRequest.current = controller;
    setCepStatus('loading');
    const address = await lookupCep(masked, controller.signal);
    if (controller.signal.aborted) return;
    if (!address) {
      setCepStatus('not-found');
      return;
    }
    setValue('street', address.street, { shouldValidate: Boolean(address.street) });
    setValue('neighborhood', address.neighborhood, {
      shouldValidate: Boolean(address.neighborhood),
    });
    setValue('city', address.city, { shouldValidate: true });
    setValue('state', address.state, { shouldValidate: true });
    setCepStatus('found');
    // CEP de rua já trouxe o logradouro → próximo campo útil é o número.
    setFocus(address.street ? 'number' : 'street');
  }

  async function onSubmit(values: RegisterFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await registerAction({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone,
        password: values.password,
        address: {
          zipCode: values.zipCode,
          street: values.street.trim(),
          number: values.number.trim(),
          complement: values.complement.trim() || undefined,
          neighborhood: values.neighborhood.trim(),
          city: values.city.trim(),
          state: values.state.trim().toUpperCase(),
        },
        acceptTerms: values.acceptTerms,
        marketingOptIn: values.marketingOptIn,
      });
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

  function onInvalid() {
    setSubmitError('Confira os campos destacados abaixo.');
  }

  const passwordType = showPassword ? 'text' : 'password';

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="flex flex-col gap-8"
      noValidate
      aria-describedby={submitError ? 'register-error' : undefined}
    >
      {submitError && (
        <FormAlert id="register-error" tone="error">
          {submitError}
        </FormAlert>
      )}

      <fieldset className={sectionClassName}>
        <legend className="mb-1">
          <Heading as="h2" size="sm">
            Seus dados
          </Heading>
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="firstName">
              Nome
            </label>
            <input
              id="firstName"
              autoComplete="given-name"
              className={inputClassName}
              aria-invalid={Boolean(errors.firstName)}
              {...register('firstName', {
                required: 'Informe seu nome.',
                minLength: { value: 2, message: 'Nome muito curto.' },
              })}
            />
            <FieldErrorText error={errors.firstName} />
          </div>
          <div>
            <label className={labelClassName} htmlFor="lastName">
              Sobrenome
            </label>
            <input
              id="lastName"
              autoComplete="family-name"
              className={inputClassName}
              aria-invalid={Boolean(errors.lastName)}
              {...register('lastName', {
                required: 'Informe seu sobrenome.',
                minLength: { value: 2, message: 'Sobrenome muito curto.' },
              })}
            />
            <FieldErrorText error={errors.lastName} />
          </div>
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
            aria-invalid={Boolean(errors.email)}
            {...register('email', {
              required: 'Informe seu e-mail.',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Informe um e-mail válido.' },
            })}
          />
          <FieldErrorText error={errors.email} />
        </div>

        <div>
          <label className={labelClassName} htmlFor="phone">
            Celular
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="(11) 99999-9999"
            className={inputClassName}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby="phone-hint"
            {...register('phone', {
              required: 'Informe seu celular.',
              validate: (value) =>
                isValidBrazilianMobile(value) || 'Informe um celular válido com DDD.',
              onChange: (event) => setValue('phone', maskBrazilianMobile(event.target.value)),
            })}
          />
          <Text id="phone-hint" size="xs" tone="muted" className="mt-1.5">
            Usado para recuperar sua senha por SMS e acompanhar seus pedidos.
          </Text>
          <FieldErrorText error={errors.phone} />
        </div>
      </fieldset>

      <fieldset className={sectionClassName}>
        <legend className="mb-1">
          <Heading as="h2" size="sm">
            Endereço
          </Heading>
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label className={labelClassName} htmlFor="zipCode">
              CEP
            </label>
            <input
              id="zipCode"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              className={inputClassName}
              aria-invalid={Boolean(errors.zipCode)}
              aria-describedby="cep-status"
              {...register('zipCode', {
                required: 'Informe o CEP.',
                pattern: { value: /^\d{5}-\d{3}$/, message: 'CEP incompleto.' },
                onChange: (event) => void handleCepChange(event.target.value),
              })}
            />
            <Text id="cep-status" size="xs" tone="muted" className="mt-1.5" aria-live="polite">
              {cepStatus === 'loading' && 'Buscando endereço…'}
              {cepStatus === 'found' && 'Endereço encontrado — confira abaixo.'}
              {cepStatus === 'not-found' && 'CEP não encontrado — preencha o endereço à mão.'}
            </Text>
            <FieldErrorText error={errors.zipCode} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName} htmlFor="street">
              Rua
            </label>
            <input
              id="street"
              autoComplete="address-line1"
              className={inputClassName}
              aria-invalid={Boolean(errors.street)}
              {...register('street', { required: 'Informe a rua.' })}
            />
            <FieldErrorText error={errors.street} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label className={labelClassName} htmlFor="number">
              Número
            </label>
            <input
              id="number"
              inputMode="numeric"
              className={inputClassName}
              aria-invalid={Boolean(errors.number)}
              {...register('number', { required: 'Informe o número.' })}
            />
            <FieldErrorText error={errors.number} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClassName} htmlFor="complement">
              Complemento (opcional)
            </label>
            <input
              id="complement"
              autoComplete="address-line2"
              placeholder="Apto, bloco, referência"
              className={inputClassName}
              {...register('complement')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className={labelClassName} htmlFor="neighborhood">
              Bairro
            </label>
            <input
              id="neighborhood"
              className={inputClassName}
              aria-invalid={Boolean(errors.neighborhood)}
              {...register('neighborhood', { required: 'Informe o bairro.' })}
            />
            <FieldErrorText error={errors.neighborhood} />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClassName} htmlFor="city">
              Cidade
            </label>
            <input
              id="city"
              autoComplete="address-level2"
              className={inputClassName}
              aria-invalid={Boolean(errors.city)}
              {...register('city', { required: 'Informe a cidade.' })}
            />
            <FieldErrorText error={errors.city} />
          </div>
          <div>
            <label className={labelClassName} htmlFor="state">
              UF
            </label>
            <input
              id="state"
              autoComplete="address-level1"
              maxLength={2}
              className={inputClassName + ' uppercase'}
              aria-invalid={Boolean(errors.state)}
              {...register('state', {
                required: 'UF',
                pattern: { value: /^[A-Za-z]{2}$/, message: 'Sigla' },
              })}
            />
            <FieldErrorText error={errors.state} />
          </div>
        </div>
      </fieldset>

      <fieldset className={sectionClassName}>
        <legend className="mb-1">
          <Heading as="h2" size="sm">
            Senha
          </Heading>
        </legend>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClassName} htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type={passwordType}
              autoComplete="new-password"
              className={inputClassName}
              aria-invalid={Boolean(errors.password)}
              aria-describedby="password-hint"
              {...register('password', {
                required: 'Crie uma senha.',
                minLength: { value: 8, message: 'A senha deve ter ao menos 8 caracteres.' },
                maxLength: { value: 72, message: 'A senha pode ter no máximo 72 caracteres.' },
              })}
            />
            <FieldErrorText error={errors.password} />
          </div>
          <div>
            <label className={labelClassName} htmlFor="confirmPassword">
              Confirme a senha
            </label>
            <input
              id="confirmPassword"
              type={passwordType}
              autoComplete="new-password"
              className={inputClassName}
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register('confirmPassword', {
                required: 'Repita a senha.',
                validate: (value) => value === getValues('password') || 'As senhas não coincidem.',
              })}
            />
            <FieldErrorText error={errors.confirmPassword} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text id="password-hint" size="xs" tone="muted">
            Mínimo de 8 caracteres. Dica: combine letras, números e símbolos.
          </Text>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            Mostrar senha
          </label>
        </div>
      </fieldset>

      <fieldset className={sectionClassName}>
        <legend className="sr-only">Autorizações</legend>
        <div>
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-1"
              aria-invalid={Boolean(errors.acceptTerms)}
              {...register('acceptTerms', {
                validate: (value) =>
                  value || 'É preciso aceitar os Termos de Uso e a Política de Privacidade.',
              })}
            />
            <span>
              Li e aceito os{' '}
              <Link href="/termos-de-uso" target="_blank" className="underline underline-offset-4">
                Termos de Uso
              </Link>{' '}
              e a{' '}
              <Link
                href="/politica-de-privacidade"
                target="_blank"
                className="underline underline-offset-4"
              >
                Política de Privacidade
              </Link>
              .
            </span>
          </label>
          <FieldErrorText error={errors.acceptTerms} />
        </div>
        <label className="flex items-start gap-3 text-sm text-ink-muted">
          <input type="checkbox" className="mt-1" {...register('marketingOptIn')} />
          <span>
            Quero receber por SMS lembretes de produtos que vi ou deixei no carrinho, além de
            novidades da ASN Supply. No máximo um lembrete por semana — você pode desativar quando
            quiser em <strong>Minha conta</strong>.
          </span>
        </label>
      </fieldset>

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
        Criar conta
      </Button>

      <Text size="sm" tone="muted" className="text-center">
        Já tem conta?{' '}
        <Link href="/entrar" className="text-ink underline underline-offset-4">
          Entrar
        </Link>
      </Text>

      <SocialLoginButtons />
    </form>
  );
}
