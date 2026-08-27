'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Text } from '@asn/ui';
import type { Address, CreateAddressInput } from '@asn/types';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';

export type AddressFormValues = CreateAddressInput;

interface AddressFormProps {
  initialValues?: Address;
  onSubmit: (values: AddressFormValues) => Promise<{ success: boolean; message?: string }>;
  onCancel: () => void;
}

const STATE_MAX_LENGTH = 2;

/** Mesmos campos/estilo de `ShippingAddressDto` (checkout), + label e "definir como padrão". */
export function AddressForm({ initialValues, onSubmit, onCancel }: AddressFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormValues>({
    mode: 'onBlur',
    defaultValues: initialValues
      ? {
          label: initialValues.label,
          recipientName: initialValues.recipientName,
          street: initialValues.street,
          number: initialValues.number,
          complement: initialValues.complement ?? undefined,
          neighborhood: initialValues.neighborhood,
          city: initialValues.city,
          state: initialValues.state,
          zipCode: initialValues.zipCode,
          isDefault: initialValues.isDefault,
        }
      : undefined,
  });

  async function handleFormSubmit(values: AddressFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await onSubmit(values);
      if (!result.success) {
        setSubmitError(result.message ?? 'Não foi possível salvar. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <label className={labelClassName} htmlFor="label">
          Identificação (ex: Casa, Trabalho)
        </label>
        <input
          id="label"
          className={inputClassName}
          {...register('label', { required: 'Dê um nome a este endereço.' })}
        />
        <FieldErrorText error={errors.label} />
      </div>

      <div>
        <label className={labelClassName} htmlFor="recipientName">
          Nome de quem recebe
        </label>
        <input
          id="recipientName"
          className={inputClassName}
          {...register('recipientName', { required: 'Informe o nome de quem recebe.' })}
        />
        <FieldErrorText error={errors.recipientName} />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <label className={labelClassName} htmlFor="street">
            Rua
          </label>
          <input
            id="street"
            className={inputClassName}
            {...register('street', { required: 'Informe a rua.' })}
          />
          <FieldErrorText error={errors.street} />
        </div>
        <div className="w-28">
          <label className={labelClassName} htmlFor="number">
            Número
          </label>
          <input
            id="number"
            className={inputClassName}
            {...register('number', { required: 'Informe o número.' })}
          />
          <FieldErrorText error={errors.number} />
        </div>
      </div>

      <div>
        <label className={labelClassName} htmlFor="complement">
          Complemento (opcional)
        </label>
        <input id="complement" className={inputClassName} {...register('complement')} />
      </div>

      <div>
        <label className={labelClassName} htmlFor="neighborhood">
          Bairro
        </label>
        <input
          id="neighborhood"
          className={inputClassName}
          {...register('neighborhood', { required: 'Informe o bairro.' })}
        />
        <FieldErrorText error={errors.neighborhood} />
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-3">
        <div>
          <label className={labelClassName} htmlFor="city">
            Cidade
          </label>
          <input
            id="city"
            className={inputClassName}
            {...register('city', { required: 'Informe a cidade.' })}
          />
          <FieldErrorText error={errors.city} />
        </div>
        <div className="w-20">
          <label className={labelClassName} htmlFor="state">
            UF
          </label>
          <input
            id="state"
            maxLength={STATE_MAX_LENGTH}
            className={`${inputClassName} uppercase`}
            {...register('state', {
              required: 'UF',
              minLength: { value: STATE_MAX_LENGTH, message: 'Use a sigla do estado (ex: SP).' },
              maxLength: STATE_MAX_LENGTH,
            })}
          />
          <FieldErrorText error={errors.state} />
        </div>
        <div className="w-32">
          <label className={labelClassName} htmlFor="zipCode">
            CEP
          </label>
          <input
            id="zipCode"
            className={inputClassName}
            {...register('zipCode', { required: 'Informe o CEP.' })}
          />
          <FieldErrorText error={errors.zipCode} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" {...register('isDefault')} />
        Definir como endereço padrão
      </label>

      {submitError && (
        <Text size="sm" className="text-error" role="alert">
          {submitError}
        </Text>
      )}

      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Salvar endereço
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
