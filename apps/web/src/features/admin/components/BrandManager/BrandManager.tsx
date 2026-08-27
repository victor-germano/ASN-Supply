'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Brand } from '@asn/types';
import { Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import { ImageUploadField } from '@/components/form/ImageUploadField';
import {
  createAdminBrandAction,
  deleteAdminBrandAction,
  updateAdminBrandAction,
} from '@/actions/adminCatalog';

interface BrandFormValues {
  name: string;
  logoUrl: string;
}

type Mode = { type: 'list' } | { type: 'creating' } | { type: 'editing'; brandId: string };

/** Mesmo padrão de `AddressBook`: lista + formulário inline, sem página própria — os campos são poucos demais pra justificar rotas dedicadas como em Produtos. */
export function BrandManager({ initialBrands }: { initialBrands: Brand[] }) {
  const [brands, setBrands] = useState(initialBrands);
  const [mode, setMode] = useState<Mode>({ type: 'list' });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  async function handleDelete(brand: Brand) {
    if (!window.confirm(`Excluir a marca "${brand.name}"? Essa ação não pode ser desfeita.`)) {
      return;
    }
    setListError(null);
    setPendingId(brand.id);
    try {
      const result = await deleteAdminBrandAction(brand.id);
      if (!result.success) {
        setListError(result.message);
        return;
      }
      setBrands((prev) => prev.filter((b) => b.id !== brand.id));
    } finally {
      setPendingId(null);
    }
  }

  if (mode.type === 'creating' || mode.type === 'editing') {
    const editing = mode.type === 'editing' ? brands.find((b) => b.id === mode.brandId) : undefined;
    return (
      <BrandForm
        initialValues={editing}
        onCancel={() => setMode({ type: 'list' })}
        onSaved={(brand) => {
          setBrands((prev) =>
            editing ? prev.map((b) => (b.id === brand.id ? brand : b)) : [...prev, brand],
          );
          setMode({ type: 'list' });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {listError && (
        <Text size="sm" className="text-error" role="alert">
          {listError}
        </Text>
      )}
      {brands.length === 0 ? (
        <Text tone="muted">Nenhuma marca cadastrada ainda.</Text>
      ) : (
        <ul className="flex flex-col gap-3">
          {brands
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((brand) => (
              <li
                key={brand.id}
                className="flex items-center justify-between gap-4 border border-ink/10 p-4"
              >
                <div className="flex items-center gap-3">
                  {brand.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brand.logoUrl} alt="" className="h-8 w-8 object-contain" />
                  )}
                  <Text size="sm">{brand.name}</Text>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setMode({ type: 'editing', brandId: brand.id })}
                    className="text-xs uppercase tracking-wider text-ink underline underline-offset-4"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={pendingId === brand.id}
                    onClick={() => handleDelete(brand)}
                    className="text-xs uppercase tracking-wider text-error underline underline-offset-4 disabled:opacity-40"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}
      <Button type="button" onClick={() => setMode({ type: 'creating' })} className="self-start">
        Adicionar marca
      </Button>
    </div>
  );
}

function BrandForm({
  initialValues,
  onSaved,
  onCancel,
}: {
  initialValues?: Brand;
  onSaved: (brand: Brand) => void;
  onCancel: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BrandFormValues>({
    mode: 'onBlur',
    defaultValues: { name: initialValues?.name ?? '', logoUrl: initialValues?.logoUrl ?? '' },
  });

  async function onSubmit(values: BrandFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const input = { name: values.name, logoUrl: values.logoUrl || undefined };
      const result = initialValues
        ? await updateAdminBrandAction(initialValues.id, input)
        : await createAdminBrandAction(input);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      onSaved(result.brand);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <label className={labelClassName} htmlFor="brand-name">
          Nome
        </label>
        <input
          id="brand-name"
          className={inputClassName}
          {...register('name', { required: 'Informe o nome da marca.' })}
        />
        <FieldErrorText error={errors.name} />
      </div>
      <ImageUploadField
        id="brand-logoUrl"
        label="Logo"
        optional
        registration={register('logoUrl')}
        onUploaded={({ url }) => setValue('logoUrl', url)}
      />
      {submitError && (
        <Text size="sm" className="text-error" role="alert">
          {submitError}
        </Text>
      )}
      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Salvar marca
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
