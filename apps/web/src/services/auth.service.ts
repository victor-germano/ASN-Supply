import type { AuthResponse, AuthenticatedUser, LoginInput, RegisterInput } from '@asn/types';
import { serverFetch } from './serverFetch';
import { authenticatedFetch } from './authenticatedFetch';

export function register(input: RegisterInput): Promise<AuthResponse> {
  return serverFetch<AuthResponse>('/auth/register', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return serverFetch<AuthResponse>('/auth/login', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

/**
 * `null` quando não há sessão válida — nunca lança. Além do 401 esperado
 * (sem sessão), qualquer outra falha (API fora do ar, erro de rede) também
 * vira `null` em vez de propagar: este helper é chamado de `conta/layout.tsx`
 * e de outros pontos de gate de autenticação sem try/catch próprio — deixar
 * um erro de rede vazar quebraria a página inteira com a tela de erro
 * genérica do Next em vez de simplesmente tratar como "não autenticado" e
 * redirecionar para /entrar, que é o comportamento seguro por padrão aqui.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    return await authenticatedFetch<AuthenticatedUser>('/auth/me');
  } catch {
    return null;
  }
}

/** Sempre resolve (nunca lança) — a API já devolve 204 exista o e-mail ou não, mesma defesa contra enumeração de `login`. */
export function forgotPassword(email: string): Promise<void> {
  return serverFetch<void>('/auth/forgot-password', {
    init: { method: 'POST', body: JSON.stringify({ email }) },
  });
}

export function resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
  return serverFetch<AuthResponse>('/auth/reset-password', {
    init: { method: 'POST', body: JSON.stringify({ token, newPassword }) },
  });
}

export function verifyEmail(token: string): Promise<void> {
  return serverFetch<void>('/auth/verify-email', {
    init: { method: 'POST', body: JSON.stringify({ token }) },
  });
}

/** Autenticado — reenviar é uma ação de quem já está logado mas ainda não confirmou (ver `EmailVerificationBanner`). */
export function resendVerification(): Promise<void> {
  return authenticatedFetch<void>('/auth/resend-verification', {
    init: { method: 'POST' },
  });
}
