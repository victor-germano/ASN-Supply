/**
 * Nomes/opções dos cookies httpOnly de sessão — compartilhado entre
 * `middleware.ts` (refresh proativo), `actions/auth.ts` (login/registro
 * setam) e `apiClient.ts` (lê para encaminhar como `Authorization: Bearer`).
 * O Next.js é quem guarda os tokens; a API (`apps/api`) nunca vê cookie,
 * só o header — ver `JwtStrategy`.
 */
export const ACCESS_TOKEN_COOKIE = 'asn_at';
export const REFRESH_TOKEN_COOKIE = 'asn_rt';

// Um pouco maior que a validade real de cada JWT (15min/30 dias, decidida
// pela API via JWT_EXPIRES_IN/JWT_REFRESH_EXPIRES_IN) — o cookie só precisa
// sobreviver até o middleware ter a chance de renovar; a validade que
// importa de verdade é a do token assinado por dentro dele.
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 20 * 60;
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 31 * 24 * 60 * 60;

export interface AuthCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
}

export function authCookieOptions(maxAgeSeconds: number): AuthCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
