'use client';

import { useState } from 'react';
import { Text } from '@asn/ui';
import { FormAlert } from '@/components/form/FormAlert';
import { updatePreferencesAction } from '@/actions/auth';
import { useInvalidateCurrentUser } from '@/hooks/useCurrentUser';

/** `+5511998887766` → `(11) 9****-7766` — mesma máscara da API. */
function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, '').slice(-11);
  return `(${digits.slice(0, 2)}) ${digits[2]}****-${digits.slice(-4)}`;
}

/**
 * Liga/desliga lembretes por SMS. Salva no próprio clique (sem botão
 * "salvar"), com confirmação visível — é o destino do link de
 * descadastro, então precisa resolver em um toque.
 */
export function NotificationPreferences({
  phone,
  initialOptIn,
}: {
  phone: string | null;
  initialOptIn: boolean;
}) {
  const invalidateCurrentUser = useInvalidateCurrentUser();
  const [optIn, setOptIn] = useState(initialOptIn);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );

  async function toggle(next: boolean) {
    setIsSaving(true);
    setFeedback(null);
    const result = await updatePreferencesAction(next);
    setIsSaving(false);
    if (!result.success) {
      setFeedback({ tone: 'error', text: result.message });
      return;
    }
    setOptIn(result.user.marketingOptIn);
    invalidateCurrentUser();
    setFeedback({
      tone: 'success',
      text: next
        ? 'Pronto! Você vai receber nossos lembretes por SMS.'
        : 'Pronto! Você não vai mais receber lembretes por SMS.',
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border border-ink/10 p-5">
        <label className="flex items-start justify-between gap-6">
          <span>
            <span className="block text-sm font-medium text-ink">
              Lembretes e novidades por SMS
            </span>
            <span className="mt-1 block text-sm text-ink-muted">
              Avisamos quando um produto que você viu ou deixou no carrinho continua disponível. No
              máximo um lembrete por semana, só em horário comercial.
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-checked={optIn}
            checked={optIn}
            disabled={isSaving || !phone}
            onChange={(event) => toggle(event.target.checked)}
            className="relative mt-1 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-ink/20 transition-colors before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow before:transition-transform before:content-[''] checked:bg-olive-600 checked:before:translate-x-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
        <Text size="xs" tone="muted" className="mt-4">
          {phone
            ? `Celular cadastrado: ${maskPhone(phone)}`
            : 'Sua conta não tem celular cadastrado — por isso os lembretes por SMS estão indisponíveis.'}
        </Text>
      </div>

      {feedback && <FormAlert tone={feedback.tone}>{feedback.text}</FormAlert>}

      <Text size="xs" tone="muted">
        Mensagens sobre seus pedidos e códigos de segurança (como o de redefinição de senha) são
        enviados sempre que necessário, independentemente desta opção.
      </Text>
    </div>
  );
}
