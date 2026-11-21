'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { AdminBanner } from '@asn/types';
import { Badge, Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import { ImageUploadField } from '@/components/form/ImageUploadField';
import {
  createAdminBannerAction,
  deleteAdminBannerAction,
  updateAdminBannerAction,
} from '@/actions/adminMarketing';

interface BannerFormValues {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrlDesktop: string;
  imageUrlMobile: string;
  position: number;
  isActive: boolean;
  /** Input `type="date"` trabalha em `YYYY-MM-DD` — convertido pra ISO completo só na hora de mandar pra API. Vazio = sem limite nessa ponta. */
  startsAt: string;
  endsAt: string;
}

type Mode = { type: 'list' } | { type: 'creating' } | { type: 'editing'; bannerId: string };

/** Mesmo padrão de `CollectionManager`: lista + formulário inline, sem página própria. */
export function BannerManager({ initialBanners }: { initialBanners: AdminBanner[] }) {
  const [banners, setBanners] = useState(initialBanners);
  const [mode, setMode] = useState<Mode>({ type: 'list' });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  async function handleDelete(banner: AdminBanner) {
    if (!window.confirm(`Excluir o banner "${banner.title}"? Essa ação não pode ser desfeita.`)) {
      return;
    }
    setListError(null);
    setPendingId(banner.id);
    try {
      const result = await deleteAdminBannerAction(banner.id);
      if (!result.success) {
        setListError(result.message);
        return;
      }
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
    } finally {
      setPendingId(null);
    }
  }

  if (mode.type === 'creating' || mode.type === 'editing') {
    const editing =
      mode.type === 'editing' ? banners.find((b) => b.id === mode.bannerId) : undefined;
    return (
      <BannerForm
        initialValues={editing}
        nextPosition={banners.length}
        onCancel={() => setMode({ type: 'list' })}
        onSaved={(banner) => {
          setBanners((prev) =>
            editing ? prev.map((b) => (b.id === banner.id ? banner : b)) : [...prev, banner],
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
      {banners.length === 0 ? (
        <Text tone="muted">Nenhum banner cadastrado ainda.</Text>
      ) : (
        <ul className="flex flex-col gap-3">
          {banners
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((banner) => (
              <li
                key={banner.id}
                className="flex items-center justify-between gap-4 border border-ink/10 p-4"
              >
                <div className="flex items-center gap-3">
                  {banner.imageUrlDesktop && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={banner.imageUrlDesktop} alt="" className="h-12 w-20 object-cover" />
                  )}
                  <div className="flex flex-col gap-1">
                    <Text size="sm">{banner.title}</Text>
                    <Text size="xs" tone="muted">
                      Posição {banner.position}
                    </Text>
                  </div>
                  <Badge tone={banner.isActive ? 'olive' : 'outline'}>
                    {banner.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setMode({ type: 'editing', bannerId: banner.id })}
                    className="text-xs uppercase tracking-wider text-ink underline underline-offset-4"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={pendingId === banner.id}
                    onClick={() => handleDelete(banner)}
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
        Adicionar banner
      </Button>
    </div>
  );
}

function BannerForm({
  initialValues,
  nextPosition,
  onSaved,
  onCancel,
}: {
  initialValues?: AdminBanner;
  nextPosition: number;
  onSaved: (banner: AdminBanner) => void;
  onCancel: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BannerFormValues>({
    mode: 'onBlur',
    defaultValues: {
      title: initialValues?.title ?? '',
      subtitle: initialValues?.subtitle ?? '',
      ctaLabel: initialValues?.ctaLabel ?? '',
      ctaHref: initialValues?.ctaHref ?? '',
      imageUrlDesktop: initialValues?.imageUrlDesktop ?? '',
      imageUrlMobile: initialValues?.imageUrlMobile ?? '',
      position: initialValues?.position ?? nextPosition,
      isActive: initialValues?.isActive ?? true,
      startsAt: initialValues?.startsAt?.slice(0, 10) ?? '',
      endsAt: initialValues?.endsAt?.slice(0, 10) ?? '',
    },
  });

  async function onSubmit(values: BannerFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const input = {
        title: values.title,
        subtitle: values.subtitle || null,
        ctaLabel: values.ctaLabel,
        ctaHref: values.ctaHref,
        imageUrlDesktop: values.imageUrlDesktop,
        imageUrlMobile: values.imageUrlMobile,
        position: Number(values.position),
        isActive: values.isActive,
        startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : null,
        endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
      };
      const result = initialValues
        ? await updateAdminBannerAction(initialValues.id, input)
        : await createAdminBannerAction(input);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      onSaved(result.banner);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <label className={labelClassName} htmlFor="banner-title">
          Título
        </label>
        <input
          id="banner-title"
          className={inputClassName}
          {...register('title', { required: 'Informe o título.' })}
        />
        <FieldErrorText error={errors.title} />
      </div>
      <div>
        <label className={labelClassName} htmlFor="banner-subtitle">
          Subtítulo <span className="normal-case text-ink-muted/70">(opcional)</span>
        </label>
        <input id="banner-subtitle" className={inputClassName} {...register('subtitle')} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="banner-ctaLabel">
            Texto do botão
          </label>
          <input
            id="banner-ctaLabel"
            className={inputClassName}
            {...register('ctaLabel', { required: 'Informe o texto do botão.' })}
          />
          <FieldErrorText error={errors.ctaLabel} />
        </div>
        <div>
          <label className={labelClassName} htmlFor="banner-ctaHref">
            Link do botão
          </label>
          <input
            id="banner-ctaHref"
            placeholder="/produtos"
            className={inputClassName}
            {...register('ctaHref', { required: 'Informe o link do botão.' })}
          />
          <FieldErrorText error={errors.ctaHref} />
        </div>
      </div>
      <ImageUploadField
        id="banner-imageUrlDesktop"
        label="Foto (desktop)"
        registration={register('imageUrlDesktop', { required: true })}
        onUploaded={({ url }) => setValue('imageUrlDesktop', url)}
      />
      <ImageUploadField
        id="banner-imageUrlMobile"
        label="Foto (celular)"
        registration={register('imageUrlMobile', { required: true })}
        onUploaded={({ url }) => setValue('imageUrlMobile', url)}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor="banner-startsAt">
            Começa a aparecer em <span className="normal-case text-ink-muted/70">(opcional)</span>
          </label>
          <input
            id="banner-startsAt"
            type="date"
            className={inputClassName}
            {...register('startsAt')}
          />
        </div>
        <div>
          <label className={labelClassName} htmlFor="banner-endsAt">
            Para de aparecer em <span className="normal-case text-ink-muted/70">(opcional)</span>
          </label>
          <input
            id="banner-endsAt"
            type="date"
            className={inputClassName}
            {...register('endsAt')}
          />
        </div>
      </div>
      <div>
        <label className={labelClassName} htmlFor="banner-position">
          Posição <span className="normal-case text-ink-muted/70">(0 aparece primeiro)</span>
        </label>
        <input
          id="banner-position"
          type="number"
          min={0}
          className={inputClassName}
          {...register('position', { valueAsNumber: true, required: true, min: 0 })}
        />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('isActive')} />
        <Text size="sm">Ativo (visível na Home)</Text>
      </label>
      {submitError && (
        <Text size="sm" className="text-error" role="alert">
          {submitError}
        </Text>
      )}
      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Salvar banner
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
