import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Heading, Text } from '@asn/ui';
import type { CheckoutFormValues } from './CheckoutFormValues';
import { inputClassName, labelClassName } from './formStyles';
import { FieldErrorText } from './FieldErrorText';

interface ContactAddressStepProps {
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
}

/**
 * Checkout como convidado (Módulo 4 — Área do Cliente/login ainda não
 * existe): pede contato + endereço de entrega direto no formulário, sem
 * exigir conta nem oferecer "endereços salvos".
 */
export function ContactAddressStep({ register, errors }: ContactAddressStepProps) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Heading as="h2" size="sm" className="mb-4">
          Contato
        </Heading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="guestName" className={labelClassName}>
              Nome completo
            </label>
            <input
              id="guestName"
              className={inputClassName}
              placeholder="Seu nome"
              {...register('guestName', {
                required: 'Informe seu nome.',
                minLength: { value: 2, message: 'Nome muito curto.' },
              })}
            />
            <FieldErrorText error={errors.guestName} />
          </div>
          <div>
            <label htmlFor="guestEmail" className={labelClassName}>
              E-mail
            </label>
            <input
              id="guestEmail"
              type="email"
              className={inputClassName}
              placeholder="seu@email.com"
              {...register('guestEmail', {
                required: 'Informe seu e-mail.',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Informe um e-mail válido.',
                },
              })}
            />
            <FieldErrorText error={errors.guestEmail} />
          </div>
          <div>
            <label htmlFor="guestPhone" className={labelClassName}>
              Telefone (com DDD)
            </label>
            <input
              id="guestPhone"
              type="tel"
              className={inputClassName}
              placeholder="+55 11 98765-4321"
              {...register('guestPhone', {
                required: 'Informe seu telefone.',
                pattern: {
                  value: /^\+?\d{10,15}$/,
                  message: 'Use só números (e opcionalmente +55).',
                },
              })}
            />
            <FieldErrorText error={errors.guestPhone} />
          </div>
        </div>
      </div>

      <div>
        <Heading as="h2" size="sm" className="mb-4">
          Endereço de entrega
        </Heading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label htmlFor="recipientName" className={labelClassName}>
              Quem recebe
            </label>
            <input
              id="recipientName"
              className={inputClassName}
              placeholder="Nome de quem vai receber"
              {...register('recipientName', {
                required: 'Informe quem vai receber.',
                minLength: { value: 2, message: 'Nome muito curto.' },
              })}
            />
            <FieldErrorText error={errors.recipientName} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="zipCode" className={labelClassName}>
              CEP
            </label>
            <input
              id="zipCode"
              className={inputClassName}
              placeholder="00000-000"
              {...register('zipCode', {
                required: 'Informe o CEP.',
                pattern: { value: /^\d{5}-?\d{3}$/, message: 'CEP inválido.' },
              })}
            />
            <FieldErrorText error={errors.zipCode} />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="street" className={labelClassName}>
              Rua
            </label>
            <input
              id="street"
              className={inputClassName}
              placeholder="Nome da rua"
              {...register('street', { required: 'Informe a rua.' })}
            />
            <FieldErrorText error={errors.street} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="number" className={labelClassName}>
              Número
            </label>
            <input
              id="number"
              className={inputClassName}
              placeholder="123"
              {...register('number', { required: 'Informe o número.' })}
            />
            <FieldErrorText error={errors.number} />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="complement" className={labelClassName}>
              Complemento <span className="normal-case text-ink-muted/70">(opcional)</span>
            </label>
            <input
              id="complement"
              className={inputClassName}
              placeholder="Apto, bloco..."
              {...register('complement')}
            />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="neighborhood" className={labelClassName}>
              Bairro
            </label>
            <input
              id="neighborhood"
              className={inputClassName}
              placeholder="Bairro"
              {...register('neighborhood', { required: 'Informe o bairro.' })}
            />
            <FieldErrorText error={errors.neighborhood} />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="city" className={labelClassName}>
              Cidade
            </label>
            <input
              id="city"
              className={inputClassName}
              placeholder="Cidade"
              {...register('city', { required: 'Informe a cidade.' })}
            />
            <FieldErrorText error={errors.city} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="state" className={labelClassName}>
              UF
            </label>
            <input
              id="state"
              className={inputClassName}
              placeholder="SP"
              maxLength={2}
              {...register('state', {
                required: 'Informe o estado.',
                minLength: { value: 2, message: 'Use a sigla (ex: SP).' },
                maxLength: { value: 2, message: 'Use a sigla (ex: SP).' },
              })}
            />
            <FieldErrorText error={errors.state} />
          </div>
        </div>
      </div>

      <Text size="xs" tone="muted">
        Seus dados são usados só para processar e entregar este pedido.
      </Text>
    </div>
  );
}
