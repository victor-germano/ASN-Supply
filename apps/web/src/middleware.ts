import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  authCookieOptions,
} from '@/lib/authCookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/v1';

/**
 * Refresh proativo de sessão para as áreas autenticadas sob o matcher
 * abaixo: evita a viagem de rede extra que o refresh reativo de
 * `authenticatedFetch.ts` faria em toda request depois do token expirar.
 * Só uma otimização, não a única linha de defesa — rotas fora do matcher
 * (checkout, confirmação de pedido) dependem do refresh reativo para não
 * quebrar quando o token expira no meio de uma sessão longa.
 */
export const config = {
  matcher: ['/conta/:path*'],
};

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (base64.length % 4)) % 4;
  return atob(base64 + '='.repeat(paddingNeeded));
}

/** Só lê o `exp` — nunca verifica assinatura. A API é a única fonte de verdade sobre validade real. */
function readExpiry(token: string): number | null {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    const payload = JSON.parse(base64UrlDecode(payloadSegment)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function isExpiredOrMissing(token: string | undefined): boolean {
  if (!token) return true;
  const exp = readExpiry(token);
  if (exp === null) return true;
  // 10s de margem para cobrir o trânsito da própria request até a API.
  return exp * 1000 < Date.now() + 10_000;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!isExpiredOrMissing(accessToken)) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return redirectToLogin(request);
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      return redirectToLogin(request);
    }

    const data = (await response.json()) as { accessToken: string; refreshToken: string };

    // Também escreve nos cookies da REQUEST (não só da response): senão o
    // Server Component desta mesma passada ainda lê o `asn_at` velho (o
    // Next não reconstrói o cookie jar da request a partir de um
    // `Set-Cookie` que só vai sair na response) e cai de novo em "não
    // autenticado" logo depois de um refresh que acabou de funcionar.
    request.cookies.set(ACCESS_TOKEN_COOKIE, data.accessToken);
    request.cookies.set(REFRESH_TOKEN_COOKIE, data.refreshToken);
    const nextResponse = NextResponse.next({ request });
    nextResponse.cookies.set(
      ACCESS_TOKEN_COOKIE,
      data.accessToken,
      authCookieOptions(ACCESS_TOKEN_MAX_AGE_SECONDS),
    );
    nextResponse.cookies.set(
      REFRESH_TOKEN_COOKIE,
      data.refreshToken,
      authCookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS),
    );
    return nextResponse;
  } catch {
    // API fora do ar/inalcançável — trata como sessão inválida em vez de
    // travar a navegação da rota protegida.
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = new URL('/entrar', request.url);
  url.searchParams.set('next', request.nextUrl.pathname);
  const response = NextResponse.redirect(url);
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  return response;
}
