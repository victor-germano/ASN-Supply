import { withSentryConfig } from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';
// HTTPS de verdade (domínio publicado) — não um build de produção rodando
// em http://localhost para testes.
const servedOverHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://');
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3400/v1').origin;

/**
 * Content-Security-Policy: lista do que o navegador pode carregar. Um
 * script injetado (XSS) não consegue chamar servidor de fora nem carregar
 * código de outro domínio, o site não pode ser embutido em iframe de
 * terceiros (clickjacking) e formulários só enviam para o próprio site.
 *
 * `'unsafe-inline'` em script-src: o Next injeta scripts inline de
 * hidratação; a alternativa (nonce) tornaria TODAS as páginas dinâmicas e
 * acabaria com o cache do catálogo. `'unsafe-eval'` só em dev (Fast Refresh).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"} https://plausible.io`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://res.cloudinary.com https://*.amazonaws.com ${apiOrigin}`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} https://viacep.com.br https://plausible.io https://*.sentry.io`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(servedOverHttps ? ['upgrade-insecure-requests'] : []),
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Não anuncia `X-Powered-By: Next.js` (dá ao atacante a versão-alvo).
  poweredByHeader: false,
  transpilePackages: ['@asn/ui', '@asn/types'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      // Imagens enviadas pelo painel em desenvolvimento, sem Cloudinary
      // (`LocalDiskImageUploader` na API).
      { protocol: 'http', hostname: 'localhost', port: '3400', pathname: '/uploads/**' },
    ],
    // Habilitado só para os SVGs estáticos de arte abstrata em
    // public/seed-art (gerados por nós, confiáveis) — usados como capa de
    // demonstração no catálogo seed até termos fotografia de produto real.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizePackageImports: ['@asn/ui', 'framer-motion'],
    // Padrão do Next (1mb) é pequeno demais para a foto do Provador
    // Digital (Módulo 7), enviada como data URL pela Server Action
    // `analyzeTryOnAction` — a foto já é redimensionada no client antes do
    // envio (ver PhotoUploader), então 4mb é folga, não o esperado.
    serverActions: { bodySizeLimit: '4mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // HTTPS obrigatório por 2 anos depois da primeira visita — só em
          // produção em https (em localhost travaria o navegador em https).
          ...(servedOverHttps
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
            : []),
        ],
      },
    ];
  },
};

// `withSentryConfig` liga a instrumentação (client/server/edge configs na
// raiz de apps/web) e, se `SENTRY_AUTH_TOKEN` existir, também sobe source
// maps pro Sentry no build. `sourcemaps.disable` explícito sem o token
// (não só deixar o plugin decidir sozinho) e `telemetry: false` — nenhuma
// chamada de rede pro Sentry deveria acontecer num build de dev/CI sem
// conta configurada. `silent: true` evita log do CLI poluindo `pnpm build`.
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
