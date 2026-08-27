import { Text } from '@asn/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/v1';

/**
 * Sem componente próprio de estado/interação — é só um `<a href>` pra
 * `GET /auth/google` da API, que faz o redirect real pro Google. Some por
 * completo sem `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` (mesmo padrão de
 * `Analytics.tsx`/`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`): o valor real de
 * "configurado ou não" mora no lado da API (`GOOGLE_OAUTH_CLIENT_ID`), e
 * essa variável pública é como o deploy da Web fica sabendo disso sem
 * round-trip nenhum — precisa ser ligada manualmente junto da chave real.
 * `GoogleAuthGuard` (API) barra a rota com 503 mesmo que este botão
 * apareça sem a chave configurada; a variável aqui é só cosmética.
 */
export function SocialLoginButtons({ next = '/conta/pedidos' }: { next?: string }) {
  if (!process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED) return null;

  const href = `${API_URL}/auth/google?next=${encodeURIComponent(next)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-ink/10" />
        <Text size="xs" tone="muted" className="uppercase tracking-wider">
          ou
        </Text>
        <div className="h-px flex-1 bg-ink/10" />
      </div>
      <a
        href={href}
        className="flex h-12 items-center justify-center gap-2 border border-ink/15 text-sm text-ink transition-colors hover:border-ink"
      >
        Continuar com Google
      </a>
    </div>
  );
}
