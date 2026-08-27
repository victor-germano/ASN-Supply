'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import { StarIcon } from '@/components/icons';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createReviewAction } from '@/actions/reviews';

interface ReviewFormValues {
  rating: number;
  title: string;
  comment: string;
}

/**
 * Avaliar exige conta (mesma regra do backend — `POST /reviews` atrás de
 * `JwtAuthGuard`). Convidado vê um CTA pra login em vez do formulário;
 * `next` leva de volta pra esta mesma PDP depois de entrar.
 */
export function WriteReviewForm({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const { user, isLoading } = useCurrentUser();
  const router = useRouter();
  const [isDone, setIsDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReviewFormValues>({ defaultValues: { rating: 0, title: '', comment: '' } });
  const rating = watch('rating');

  if (isLoading) return null;

  if (!user) {
    return (
      <div className="mb-10 border border-ink/10 bg-bone-200 p-5">
        <Text size="sm">
          <Link
            href={`/entrar?next=/produtos/${productSlug}%23avaliacoes`}
            className="text-ink underline underline-offset-4"
          >
            Entre na sua conta
          </Link>{' '}
          para avaliar este produto.
        </Text>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="mb-10 border border-ink/10 bg-bone-200 p-5">
        <Text size="sm">Sua avaliação foi enviada. Obrigado!</Text>
      </div>
    );
  }

  async function onSubmit(values: ReviewFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await createReviewAction(
        {
          productId,
          rating: values.rating as 1 | 2 | 3 | 4 | 5,
          title: values.title,
          comment: values.comment,
        },
        productSlug,
      );
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      setIsDone(true);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mb-10 flex flex-col gap-4 border border-ink/10 p-5"
      noValidate
    >
      <Text weight="medium">Avaliar este produto</Text>

      <div>
        <span className={labelClassName}>Nota</span>
        <div className="flex gap-1" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
              onClick={() => setValue('rating', star, { shouldValidate: true })}
              className="p-0.5"
            >
              <StarIcon
                className={`h-6 w-6 ${star <= rating ? 'text-olive-500' : 'text-ink/15'}`}
              />
            </button>
          ))}
        </div>
        <input
          type="hidden"
          {...register('rating', { validate: (value) => value > 0 || 'Escolha uma nota.' })}
        />
        <FieldErrorText error={errors.rating} />
      </div>

      <div>
        <label className={labelClassName} htmlFor="review-title">
          Título
        </label>
        <input
          id="review-title"
          className={inputClassName}
          placeholder="Resuma sua experiência"
          {...register('title', {
            required: 'Dê um título curto pra sua avaliação.',
            minLength: { value: 2, message: 'Título muito curto.' },
          })}
        />
        <FieldErrorText error={errors.title} />
      </div>

      <div>
        <label className={labelClassName} htmlFor="review-comment">
          Comentário
        </label>
        <textarea
          id="review-comment"
          rows={3}
          className={inputClassName}
          placeholder="O que você achou do produto?"
          {...register('comment', {
            required: 'Conte um pouco mais sobre sua experiência.',
            minLength: { value: 10, message: 'Conte um pouco mais — pelo menos 10 caracteres.' },
          })}
        />
        <FieldErrorText error={errors.comment} />
      </div>

      {submitError && (
        <Text size="sm" className="text-error" role="alert">
          {submitError}
        </Text>
      )}

      <Button type="submit" size="md" isLoading={isSubmitting} className="self-start">
        Enviar avaliação
      </Button>
    </form>
  );
}
