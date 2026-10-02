import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
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
