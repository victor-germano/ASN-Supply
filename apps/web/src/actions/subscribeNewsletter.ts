'use server';

import { z } from 'zod';
import { ApiError } from '@/services/apiClient';
import { subscribeToNewsletter } from '@/services/marketing.service';

const emailSchema = z.string().trim().email('Informe um e-mail válido.');

export interface NewsletterFormState {
  status: 'idle' | 'success' | 'error';
  message: string | null;
}

export const initialNewsletterFormState: NewsletterFormState = {
  status: 'idle',
  message: null,
};

/**
 * Server Action do formulário de newsletter. Valida no servidor
 * independentemente da validação client-side (nunca confia só no client) e
 * traduz falhas da API em mensagens que o formulário pode exibir sem
 * expor detalhes internos.
 */
export async function subscribeNewsletterAction(
  _previousState: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  const parsed = emailSchema.safeParse(formData.get('email'));

  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'E-mail inválido.' };
  }

  try {
    await subscribeToNewsletter(parsed.data);
    return { status: 'success', message: 'Inscrição confirmada. Bem-vindo(a) à ASN Supply.' };
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : 'Não foi possível concluir sua inscrição agora.';
    return { status: 'error', message };
  }
}
