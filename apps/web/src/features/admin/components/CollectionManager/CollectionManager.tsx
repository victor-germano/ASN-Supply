'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { AdminCollection } from '@asn/types';
import { Badge, Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import {
  createAdminCollectionAction,
  deleteAdminCollectionAction,
  updateAdminCollectionAction,
} from '@/actions/adminCatalog';

interface CollectionFormValues {
  name: string;
  description: string;
  coverImageUrl: string;
  coverImageAlt: string;
  /** Input `type="date"` trabalha em `YYYY-MM-DD` — convertido pra ISO completo só na hora de mandar pra API. Vazio = ainda não lançada. */
  launchedAt: string;
}

type Mode = { type: 'list' } | { type: 'creating' } | { type: 'editing'; collectionId: string };

export function CollectionManager({
  initialCollections,
}: {
  initialCollections: AdminCollection[];
}) {
  const [collections, setCollections] = useState(initialCollections);
  const [mode, setMode] = useState<Mode>({ type: 'list' });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  async function handleDelete(collection: AdminCollection) {
    if (
      !window.confirm(`Excluir a coleção "${collection.name}"? Essa ação não pode ser desfeita.`)
    ) {
      return;
    }
    setListError(null);
    setPendingId(collection.id);
    try {
      const result = await deleteAdminCollectionAction(collection.id);
      if (!result.success) {
        setListError(result.message);
        return;
      }
      setCollections((prev) => prev.filter((c) => c.id !== collection.id));
    } finally {
      setPendingId(null);
    }
  }

  if (mode.type === 'creating' || mode.type === 'editing') {
    const editing =
      mode.type === 'editing' ? collections.find((c) => c.id === mode.collectionId) : undefined;
    return (
      <CollectionForm
        initialValues={editing}
        onCancel={() => setMode({ type: 'list' })}
        onSaved={(collection) => {
          setCollections((prev) =>
            editing
              ? prev.map((c) => (c.id === collection.id ? collection : c))
              : [...prev, collection],
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
      {collections.length === 0 ? (
        <Text tone="muted">Nenhuma coleção cadastrada ainda.</Text>
      ) : (
        <ul className="flex flex-col gap-3">
          {collections.map((collection) => (
            <li
              key={collection.id}
              className="flex items-center justify-between gap-4 border border-ink/10 p-4"
            >
              <div className="flex items-center gap-2">
                <Text size="sm">{collection.name}</Text>
                <Badge tone={collection.launchedAt ? 'olive' : 'outline'}>
                  {collection.launchedAt ? 'Lançada' : 'Rascunho'}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setMode({ type: 'editing', collectionId: collection.id })}
                  className="text-xs uppercase tracking-wider text-ink underline underline-offset-4"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={pendingId === collection.id}
                  onClick={() => handleDelete(collection)}
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
        Adicionar coleção
      </Button>
    </div>
  );
}

function CollectionForm({
  initialValues,
  onSaved,
  onCancel,
}: {
  initialValues?: AdminCollection;
  onSaved: (collection: AdminCollection) => void;
  onCancel: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CollectionFormValues>({
    mode: 'onBlur',
    defaultValues: {
      name: initialValues?.name ?? '',
      description: initialValues?.description ?? '',
      coverImageUrl: initialValues?.coverImageUrl ?? '',
      coverImageAlt: initialValues?.coverImageAlt ?? '',
      launchedAt: initialValues?.launchedAt?.slice(0, 10) ?? '',
    },
  });

  async function onSubmit(values: CollectionFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const input = {
        name: values.name,
        description: values.description,
        coverImageUrl: values.coverImageUrl || undefined,
        coverImageAlt: values.coverImageAlt || undefined,
        // Vazio = "ainda não lançada" (`null` explícito) — diferente de
        // omitir o campo, que num PATCH deixaria o valor atual intocado.
        launchedAt: values.launchedAt ? new Date(values.launchedAt).toISOString() : null,
      };
      const result = initialValues
        ? await updateAdminCollectionAction(initialValues.id, input)
        : await createAdminCollectionAction(input);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      onSaved(result.collection);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <label className={labelClassName} htmlFor="collection-name">
          Nome
        </label>
        <input
          id="collection-name"
          className={inputClassName}
          {...register('name', { required: 'Informe o nome da coleção.' })}
        />
        <FieldErrorText error={errors.name} />
      </div>
      <div>
        <label className={labelClassName} htmlFor="collection-description">
          Descrição
        </label>
        <textarea
          id="collection-description"
          rows={3}
          className={inputClassName}
          {...register('description', { required: 'Informe uma descrição.' })}
        />
        <FieldErrorText error={errors.description} />
      </div>
      <div>
        <label className={labelClassName} htmlFor="collection-coverImageUrl">
          URL da capa <span className="normal-case text-ink-muted/70">(opcional)</span>
        </label>
        <input
          id="collection-coverImageUrl"
          className={inputClassName}
          {...register('coverImageUrl')}
        />
      </div>
      <div>
        <label className={labelClassName} htmlFor="collection-coverImageAlt">
          Texto alternativo da capa{' '}
          <span className="normal-case text-ink-muted/70">(obrigatório se preencheu a URL)</span>
        </label>
        <input
          id="collection-coverImageAlt"
          className={inputClassName}
          {...register('coverImageAlt')}
        />
      </div>
      <div>
        <label className={labelClassName} htmlFor="collection-launchedAt">
          Data de lançamento{' '}
          <span className="normal-case text-ink-muted/70">
            (vazio = rascunho, some da Home e de /colecoes)
          </span>
        </label>
        <input
          id="collection-launchedAt"
          type="date"
          className={inputClassName}
          {...register('launchedAt')}
        />
      </div>
      {submitError && (
        <Text size="sm" className="text-error" role="alert">
          {submitError}
        </Text>
      )}
      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Salvar coleção
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
