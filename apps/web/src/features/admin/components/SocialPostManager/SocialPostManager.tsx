'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { AdminSocialPost } from '@asn/types';
import { Badge, Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import { ImageUploadField } from '@/components/form/ImageUploadField';
import {
  createAdminSocialPostAction,
  deleteAdminSocialPostAction,
  updateAdminSocialPostAction,
} from '@/actions/adminMarketing';

interface SocialPostFormValues {
  imageUrl: string;
  permalink: string;
  caption: string;
  position: number;
  isActive: boolean;
}

type Mode = { type: 'list' } | { type: 'creating' } | { type: 'editing'; postId: string };

/** Mesmo padrão de `BannerManager`: lista + formulário inline, sem página própria. */
export function SocialPostManager({ initialPosts }: { initialPosts: AdminSocialPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [mode, setMode] = useState<Mode>({ type: 'list' });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  async function handleDelete(post: AdminSocialPost) {
    if (!window.confirm('Excluir este post? Essa ação não pode ser desfeita.')) {
      return;
    }
    setListError(null);
    setPendingId(post.id);
    try {
      const result = await deleteAdminSocialPostAction(post.id);
      if (!result.success) {
        setListError(result.message);
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } finally {
      setPendingId(null);
    }
  }

  if (mode.type === 'creating' || mode.type === 'editing') {
    const editing = mode.type === 'editing' ? posts.find((p) => p.id === mode.postId) : undefined;
    return (
      <SocialPostForm
        initialValues={editing}
        nextPosition={posts.length}
        onCancel={() => setMode({ type: 'list' })}
        onSaved={(post) => {
          setPosts((prev) =>
            editing ? prev.map((p) => (p.id === post.id ? post : p)) : [...prev, post],
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
      {posts.length === 0 ? (
        <Text tone="muted">Nenhum post cadastrado ainda.</Text>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((post) => (
              <li
                key={post.id}
                className="flex items-center justify-between gap-4 border border-ink/10 p-4"
              >
                <div className="flex items-center gap-3">
                  {post.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.imageUrl} alt="" className="h-12 w-12 object-cover" />
                  )}
                  <Text size="sm" className="max-w-xs truncate">
                    {post.caption || post.permalink}
                  </Text>
                  <Badge tone={post.isActive ? 'olive' : 'outline'}>
                    {post.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setMode({ type: 'editing', postId: post.id })}
                    className="text-xs uppercase tracking-wider text-ink underline underline-offset-4"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={pendingId === post.id}
                    onClick={() => handleDelete(post)}
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
        Adicionar post
      </Button>
    </div>
  );
}

function SocialPostForm({
  initialValues,
  nextPosition,
  onSaved,
  onCancel,
}: {
  initialValues?: AdminSocialPost;
  nextPosition: number;
  onSaved: (post: AdminSocialPost) => void;
  onCancel: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SocialPostFormValues>({
    mode: 'onBlur',
    defaultValues: {
      imageUrl: initialValues?.imageUrl ?? '',
      permalink: initialValues?.permalink ?? '',
      caption: initialValues?.caption ?? '',
      position: initialValues?.position ?? nextPosition,
      isActive: initialValues?.isActive ?? true,
    },
  });

  async function onSubmit(values: SocialPostFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const input = {
        imageUrl: values.imageUrl,
        permalink: values.permalink,
        caption: values.caption || null,
        position: Number(values.position),
        isActive: values.isActive,
      };
      const result = initialValues
        ? await updateAdminSocialPostAction(initialValues.id, input)
        : await createAdminSocialPostAction(input);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      onSaved(result.post);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <ImageUploadField
        id="social-post-imageUrl"
        label="Foto"
        registration={register('imageUrl', { required: true })}
        onUploaded={({ url }) => setValue('imageUrl', url)}
      />
      <div>
        <label className={labelClassName} htmlFor="social-post-permalink">
          Link (ex: post do Instagram)
        </label>
        <input
          id="social-post-permalink"
          placeholder="https://instagram.com/p/..."
          className={inputClassName}
          {...register('permalink', { required: 'Informe o link do post.' })}
        />
        <FieldErrorText error={errors.permalink} />
      </div>
      <div>
        <label className={labelClassName} htmlFor="social-post-caption">
          Legenda <span className="normal-case text-ink-muted/70">(opcional)</span>
        </label>
        <input id="social-post-caption" className={inputClassName} {...register('caption')} />
      </div>
      <div>
        <label className={labelClassName} htmlFor="social-post-position">
          Posição <span className="normal-case text-ink-muted/70">(0 aparece primeiro)</span>
        </label>
        <input
          id="social-post-position"
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
          Salvar post
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
