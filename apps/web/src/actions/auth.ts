'use server';

import { cookies } from 'next/headers';
import type { LoginInput, RegisterInput } from '@asn/types';
import type { AuthenticatedUser } from '@asn/types';
import { ApiError } from '@/services/apiClient';
import {
  forgotPassword,
  getCurrentUser,
  login,
  register,
  resendVerification,
  resetPassword,
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
    const message =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível criar sua conta agora. Tente novamente em instantes.';
    return { success: false, message };
  }
}

export async function loginAction(input: LoginInput): Promise<AuthActionResult> {
  try {
    const result = await login(input);
    await setSessionCookies(result.accessToken, result.refreshToken);
    return { success: true };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível entrar agora. Tente novamente em instantes.';
    return { success: false, message };
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
export async function forgotPasswordAction(email: string): Promise<void> {
  try {
    await forgotPassword(email);
  } catch {
    // Best-effort de propósito: mesmo uma falha real (rede, API fora do
    // ar) não deve virar um erro visível diferente de "e-mail não
    // encontrado" — o formulário sempre mostra a mesma mensagem genérica.
  }
}

export async function resetPasswordAction(
  token: string,
  newPassword: string,
): Promise<AuthActionResult> {
  try {
    const result = await resetPassword(token, newPassword);
    await setSessionCookies(result.accessToken, result.refreshToken);
    return { success: true };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível redefinir sua senha agora. Tente novamente em instantes.';
    return { success: false, message };
  }
}

export async function verifyEmailAction(token: string): Promise<AuthActionResult> {
  try {
    await verifyEmail(token);
    return { success: true };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível confirmar seu e-mail agora. Tente novamente em instantes.';
    return { success: false, message };
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
    const message =
      error instanceof ApiError
        ? error.message
        : 'Não foi possível reenviar o e-mail agora. Tente novamente em instantes.';
    return { success: false, message };
  }
}
