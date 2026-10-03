'use server';

import { cookies } from 'next/headers';
import type { LoginInput, PasswordResetChannel, RegisterInput } from '@asn/types';
import type { AuthenticatedUser } from '@asn/types';
import { ApiError } from '@/services/apiClient';
import {
  forgotPassword,
  getCurrentUser,
  login,
  register,
  resendVerification,
  resetPassword,
  resetPasswordWithCode,
  trackActivity,
  updatePreferences,
  verifyEmail,
} from '@/services/auth.service';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  authCookieOptions,
} from '@/lib/authCookies';

export type AuthActionResult = { success: true } | { success: false; message: string };

/**
 * Mensagem de erro própria pra exibir ao cliente. O 429 vem da API com o
 * texto técnico do Nest ("ThrottlerException: Too Many Requests") — nunca
 * deve chegar à tela assim.
 */
function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    // Conta travada por excesso de senhas erradas: a mensagem da API já é
    // a certa (15 min, sugere redefinir a senha).
    if (error.statusCode === 429 && error.errorCode !== 'LOGIN_LOCKED') {
      return 'Muitas tentativas seguidas. Por segurança, aguarde 1 minuto e tente de novo.';
    }
    return error.message;
  }
  return fallback;
}

async function setSessionCookies(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    ACCESS_TOKEN_COOKIE,
    accessToken,
    authCookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS),
  );
  cookieStore.set(
    REFRESH_TOKEN_COOKIE,
    refreshToken,
    authCookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS),
  );
}

/** Mesmo padrão de resultado (união discriminada, nunca lança) de `createOrderAction`. */
export async function registerAction(input: RegisterInput): Promise<AuthActionResult> {
  try {
    const result = await register(input);
    await setSessionCookies(result.accessToken, result.refreshToken);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: friendlyError(
        error,
        'Não foi possível criar sua conta agora. Tente novamente em instantes.',
      ),
    };
  }
}

export async function loginAction(input: LoginInput): Promise<AuthActionResult> {
  try {
    const result = await login(input);
    await setSessionCookies(result.accessToken, result.refreshToken);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: friendlyError(error, 'Não foi possível entrar agora. Tente novamente em instantes.'),
    };
  }
}

/**
 * `POST /auth/logout` na API é um no-op stateless (não há nada para
 * revogar no v1 — ver `AuthService`), então não vale a chamada de rede
 * extra: limpar os cookies aqui já é, na prática, o logout inteiro.
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

/**
 * Server Action usada como `queryFn` por `useCurrentUser` — o client
 * component nunca lê o cookie httpOnly diretamente, só por essa borda.
 */
export async function getCurrentUserAction(): Promise<AuthenticatedUser | null> {
  return getCurrentUser();
}

/** Sempre resolve em sucesso — nunca revela se o e-mail existe (ver `AuthService.requestPasswordReset`). */
export async function forgotPasswordAction(
  email: string,
  channel: PasswordResetChannel = 'email',
): Promise<void> {
  try {
    await forgotPassword(email, channel);
  } catch {
    // Best-effort de propósito: mesmo uma falha real (rede, API fora do
    // ar) não deve virar um erro visível diferente de "e-mail não
    // encontrado" — o formulário sempre mostra a mesma mensagem genérica.
  }
}

/** `redirectTo`: admin volta pro painel, cliente pra conta — a mesma tela de "esqueci a senha" serve os dois. */
export async function resetPasswordAction(
  token: string,
  newPassword: string,
): Promise<{ success: true; redirectTo: string } | { success: false; message: string }> {
  try {
    const result = await resetPassword(token, newPassword);
    await setSessionCookies(result.accessToken, result.refreshToken);
    return {
      success: true,
      redirectTo: result.user.role === 'ADMIN' ? '/admin' : '/conta/pedidos',
    };
  } catch (error) {
    return {
      success: false,
      message: friendlyError(
        error,
        'Não foi possível redefinir sua senha agora. Tente novamente em instantes.',
      ),
    };
  }
}

export async function verifyEmailAction(token: string): Promise<AuthActionResult> {
  try {
    await verifyEmail(token);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: friendlyError(
        error,
        'Não foi possível confirmar seu e-mail agora. Tente novamente em instantes.',
      ),
    };
  }
}

/**
 * Chamada por `/auth/google/callback` (Client Component) logo depois de ler
 * `accessToken`/`refreshToken` do `#fragment` da URL — nunca do lado do
 * servidor (o fragmento nunca chega até aqui sozinho, só o navegador o
 * lê). É só isso: os tokens já foram emitidos de verdade pela API
 * (`AuthController.googleCallback`), esta Server Action só os transforma
 * em cookies httpOnly, mesmo passo final de `loginAction`/`registerAction`.
 */
export async function completeGoogleLoginAction(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await setSessionCookies(accessToken, refreshToken);
}

export async function resendVerificationAction(): Promise<AuthActionResult> {
  try {
    await resendVerification();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: friendlyError(
        error,
        'Não foi possível reenviar o e-mail agora. Tente novamente em instantes.',
      ),
    };
  }
}

/** Redefinição pelo código de 6 dígitos do SMS — mesmo destino pós-sucesso de `resetPasswordAction`. */
export async function resetPasswordWithCodeAction(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ success: true; redirectTo: string } | { success: false; message: string }> {
  try {
    const result = await resetPasswordWithCode(email, code, newPassword);
    await setSessionCookies(result.accessToken, result.refreshToken);
    return {
      success: true,
      redirectTo: result.user.role === 'ADMIN' ? '/admin' : '/conta/pedidos',
    };
  } catch (error) {
    return {
      success: false,
      message: friendlyError(
        error,
        'Não foi possível redefinir sua senha agora. Tente novamente em instantes.',
      ),
    };
  }
}

export async function updatePreferencesAction(
  marketingOptIn: boolean,
): Promise<{ success: true; user: AuthenticatedUser } | { success: false; message: string }> {
  try {
    return { success: true, user: await updatePreferences(marketingOptIn) };
  } catch (error) {
    return {
      success: false,
      message: friendlyError(error, 'Não foi possível salvar sua preferência agora.'),
    };
  }
}

/**
 * Best-effort e silencioso: registrar interesse nunca pode atrapalhar a
 * navegação (sem sessão, rede fora, limite atingido — tudo é ignorado).
 */
export async function trackActivityAction(
  productId: string,
  type: 'PRODUCT_VIEW' | 'CART_ADD',
): Promise<void> {
  try {
    await trackActivity(productId, type);
  } catch {
    // ignorado de propósito
  }
}
