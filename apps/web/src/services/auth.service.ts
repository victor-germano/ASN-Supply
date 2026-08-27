import type { AuthResponse, AuthenticatedUser, LoginInput, RegisterInput } from '@asn/types';
import { apiFetch } from './apiClient';
import { authenticatedFetch } from './authenticatedFetch';

export function register(input: RegisterInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    init: { method: 'POST', body: JSON.stringify(input) },
  });
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
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
