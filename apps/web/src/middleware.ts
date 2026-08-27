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
 * (confirmação de pedido) dependem do refresh reativo para não quebrar
 * quando o token expira no meio de uma sessão longa.
 *
 * `/checkout` está aqui por decisão de produto, não técnica: navegação,
 * favoritos e carrinho continuam livres para visitante (`zustand
 * persist` guarda o carrinho independente de sessão) — só a intenção de
 * pagar exige conta. A API não muda por causa disso: `OrdersController`
 * continua aceitando pedido de convidado via `OptionalJwtAuthGuard`; o
 * gate é só do lado do site.
 *
 * `/admin/:path*` cobre a área administrativa — mas o próprio
 * `/admin/entrar` (a página de login) não pode cair na mesma exigência,
 * senão um visitante sem sessão é redirecionado pra ela e nunca
 * consegue chegar lá (loop). `isAdminLoginRoute` abaixo trata esse caso
 * antes de qualquer checagem de token.
 */
export const config = {
  matcher: ['/conta/:path*', '/checkout', '/admin/:path*'],
};

function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function isAdminLoginRoute(pathname: string): boolean {
  return pathname === '/admin/entrar';
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (base64.length % 4)) % 4;
  return atob(base64 + '='.repeat(paddingNeeded));
}

function decodePayload(token: string): { exp?: number; role?: string } | null {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    return JSON.parse(base64UrlDecode(payloadSegment)) as { exp?: number; role?: string };
  } catch {
    return null;
  }
}

/** Só lê o `exp` — nunca verifica assinatura. A API é a única fonte de verdade sobre validade real. */
function readExpiry(token: string): number | null {
  const payload = decodePayload(token);
  return typeof payload?.exp === 'number' ? payload.exp : null;
}

/**
 * Só decorativo/defesa em profundidade — nunca verifica assinatura (isso
 * já vale para `readExpiry` acima, mesmo raciocínio aqui). Um token
 * adulterado que minta `role: 'ADMIN'` no payload não passa disso: a API
 * (`JwtStrategy`, `RolesGuard`) sempre revalida com a assinatura de
 * verdade em toda request real — este gate aqui só evita a viagem até lá
 * pra quem obviamente não é admin, a mesma lógica de `AdminLayout`
 * (`user.role !== 'ADMIN'`) na camada de baixo.
 */
function readRole(token: string): string | undefined {
  return decodePayload(token)?.role;
}

function isExpiredOrMissing(token: string | undefined): boolean {
  if (!token) return true;
  const exp = readExpiry(token);
  if (exp === null) return true;
  // 10s de margem para cobrir o trânsito da própria request até a API.
  return exp * 1000 < Date.now() + 10_000;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  // A própria página de login administrativo não pode exigir sessão —
  // senão um visitante sem conta é redirecionado pra ela e nunca chega
  // lá (loop). Ver comentário em `isAdminLoginRoute`.
  if (isAdminLoginRoute(pathname)) {
    return NextResponse.next();
  }
  const wantsAdmin = isAdminRoute(pathname);

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!isExpiredOrMissing(accessToken)) {
    return guardAdminRole(request, wantsAdmin, accessToken!);
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return redirectToLogin(request, wantsAdmin);
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      return redirectToLogin(request, wantsAdmin);
    }

    const data = (await response.json()) as { accessToken: string; refreshToken: string };

    if (wantsAdmin && readRole(data.accessToken) !== 'ADMIN') {
      return redirectAway(request);
    }

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
    return redirectToLogin(request, wantsAdmin);
  }
}

/**
 * Token já válido (não expirado) — só falta a checagem de papel para
 * rotas administrativas. Cliente comum autenticado (`CUSTOMER`) volta
 * pra `/` em silêncio (`redirectAway`), não pra tela de login — não faz
 * sentido "convidar" alguém a logar numa área que já sabemos que não é
 * dele.
 */
function guardAdminRole(
  request: NextRequest,
  wantsAdmin: boolean,
  accessToken: string,
): NextResponse {
  if (wantsAdmin && readRole(accessToken) !== 'ADMIN') {
    return redirectAway(request);
  }
  return NextResponse.next();
}

function redirectToLogin(request: NextRequest, wantsAdmin: boolean): NextResponse {
  const url = new URL(wantsAdmin ? '/admin/entrar' : '/entrar', request.url);
  if (!wantsAdmin) {
    url.searchParams.set('next', request.nextUrl.pathname);
  }
  const response = NextResponse.redirect(url);
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  return response;
}

/** Sessão válida, mas sem o papel exigido pela rota — não é "não autenticado", então não redireciona pra login nenhum. */
function redirectAway(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/', request.url));
}
