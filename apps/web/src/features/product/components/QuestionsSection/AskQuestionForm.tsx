'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Button, Text } from '@asn/ui';
import { inputClassName, labelClassName } from '@/components/form/formStyles';
import { FieldErrorText } from '@/components/form/FieldErrorText';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createQuestionAction } from '@/actions/reviews';

interface QuestionFormValues {
  question: string;
}

/** Mesmo padrão de `WriteReviewForm`: perguntar exige conta, convidado vê um CTA pra login em vez do formulário. */
export function AskQuestionForm({
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
    reset,
    formState: { errors },
  } = useForm<QuestionFormValues>({ defaultValues: { question: '' } });

  if (isLoading) return null;

  if (!user) {
    return (
      <div className="mb-8 border border-ink/10 bg-bone-200 p-5">
        <Text size="sm">
          <Link
            href={`/entrar?next=/produtos/${productSlug}%23perguntas`}
            className="text-ink underline underline-offset-4"
          >
            Entre na sua conta
          </Link>{' '}
          para enviar uma pergunta.
        </Text>
      </div>
    );
  }

  async function onSubmit(values: QuestionFormValues) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const result = await createQuestionAction(
        { productId, question: values.question },
        productSlug,
      );
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      setIsDone(true);
      reset();
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mb-8 flex flex-col gap-3 border border-ink/10 p-5"
      noValidate
    >
      <label className={labelClassName} htmlFor="question-text">
        Fazer uma pergunta
      </label>
      <textarea
        id="question-text"
        rows={2}
        className={inputClassName}
        placeholder="Ex: Esse tênis serve largo?"
        {...register('question', {
          required: 'Escreva sua pergunta.',
          minLength: { value: 5, message: 'Escreva a pergunta com um pouco mais de detalhe.' },
        })}
      />
      <FieldErrorText error={errors.question} />

      {isDone && (
        <Text size="sm" tone="muted">
          Pergunta enviada — assim que respondida, aparece aqui pra todo mundo.
        </Text>
      )}
      {submitError && (
        <Text size="sm" className="text-error" role="alert">
          {submitError}
        </Text>
      )}

      <Button type="submit" size="md" isLoading={isSubmitting} className="self-start">
        Enviar pergunta
      </Button>
    </form>
  );
}
