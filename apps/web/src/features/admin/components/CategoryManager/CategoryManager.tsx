'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { AdminCategory } from '@asn/types';
import { Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import {
  createAdminCategoryAction,
  deleteAdminCategoryAction,
  updateAdminCategoryAction,
} from '@/actions/adminCatalog';

interface CategoryFormValues {
  name: string;
  parentId: string;
  imageUrl: string;
  imageAlt: string;
}

type Mode = { type: 'list' } | { type: 'creating' } | { type: 'editing'; categoryId: string };

export function CategoryManager({ initialCategories }: { initialCategories: AdminCategory[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [mode, setMode] = useState<Mode>({ type: 'list' });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  async function handleDelete(category: AdminCategory) {
    if (
      !window.confirm(`Excluir a categoria "${category.name}"? Essa ação não pode ser desfeita.`)
    ) {
      return;
    }
    setListError(null);
    setPendingId(category.id);
    try {
      const result = await deleteAdminCategoryAction(category.id);
      if (!result.success) {
        setListError(result.message);
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
    } finally {
      setPendingId(null);
    }
  }

  if (mode.type === 'creating' || mode.type === 'editing') {
    const editing =
      mode.type === 'editing' ? categories.find((c) => c.id === mode.categoryId) : undefined;
    return (
      <CategoryForm
        initialValues={editing}
        // Uma categoria não pode virar pai dela mesma — a API já rejeita
        // isso (checagem de ciclo em `AdminCategoriesRepository`), mas
        // nem oferecer a opção no dropdown evita o erro na maioria dos casos.
        availableParents={categories.filter((c) => c.id !== editing?.id)}
        onCancel={() => setMode({ type: 'list' })}
        onSaved={(category) => {
          setCategories((prev) =>
            editing ? prev.map((c) => (c.id === category.id ? category : c)) : [...prev, category],
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
      {categories.length === 0 ? (
        <Text tone="muted">Nenhuma categoria cadastrada ainda.</Text>
      ) : (
        <ul className="flex flex-col gap-3">
          {categories
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-4 border border-ink/10 p-4"
              >
                <div>
                  <Text size="sm">{category.name}</Text>
                  {category.parentId && (
                    <Text size="xs" tone="muted">
                      Subcategoria de {nameById.get(category.parentId) ?? '—'}
                    </Text>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setMode({ type: 'editing', categoryId: category.id })}
                    className="text-xs uppercase tracking-wider text-ink underline underline-offset-4"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={pendingId === category.id}
                    onClick={() => handleDelete(category)}
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
        Adicionar categoria
      </Button>
    </div>
  );
}

function CategoryForm({
  initialValues,
  availableParents,
  onSaved,
  onCancel,
}: {
  initialValues?: AdminCategory;
  availableParents: AdminCategory[];
  onSaved: (category: AdminCategory) => void;
  onCancel: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    mode: 'onBlur',
    defaultValues: {
      name: initialValues?.name ?? '',
      parentId: initialValues?.parentId ?? '',
      imageUrl: initialValues?.imageUrl ?? '',
      imageAlt: initialValues?.imageAlt ?? '',
    },
  });

  async function onSubmit(values: CategoryFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const input = {
        name: values.name,
        parentId: values.parentId || undefined,
        imageUrl: values.imageUrl || undefined,
        imageAlt: values.imageAlt || undefined,
      };
      const result = initialValues
        ? // `parentId: ''` precisa chegar até a API pra "limpar" o pai —
          // omitido pelo `input` acima (que trata `''` como "não mandar" pra
          // criação), então reconstruído aqui só pro PATCH.
          await updateAdminCategoryAction(initialValues.id, {
            ...input,
            parentId: values.parentId,
          })
        : await createAdminCategoryAction(input);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      onSaved(result.category);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div>
        <label className={labelClassName} htmlFor="category-name">
          Nome
        </label>
        <input
          id="category-name"
          className={inputClassName}
          {...register('name', { required: 'Informe o nome da categoria.' })}
        />
        <FieldErrorText error={errors.name} />
      </div>
      <div>
        <label className={labelClassName} htmlFor="category-parentId">
          Categoria pai <span className="normal-case text-ink-muted/70">(opcional)</span>
        </label>
        <select id="category-parentId" className={inputClassName} {...register('parentId')}>
          <option value="">Nenhuma (categoria de topo)</option>
          {availableParents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClassName} htmlFor="category-imageUrl">
          URL da imagem <span className="normal-case text-ink-muted/70">(opcional)</span>
        </label>
        <input id="category-imageUrl" className={inputClassName} {...register('imageUrl')} />
      </div>
      <div>
        <label className={labelClassName} htmlFor="category-imageAlt">
          Texto alternativo da imagem{' '}
          <span className="normal-case text-ink-muted/70">
            (obrigatório se preencheu a URL, pra aparecer na Home)
          </span>
        </label>
        <input id="category-imageAlt" className={inputClassName} {...register('imageAlt')} />
      </div>
      {submitError && (
        <Text size="sm" className="text-error" role="alert">
          {submitError}
        </Text>
      )}
      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Salvar categoria
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
