/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@asn/ui', '@asn/types'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
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

export default nextConfig;
