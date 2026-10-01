import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';

/**
 * Sitemap estático (rotas institucionais). Rotas dinâmicas de produto,
 * categoria e coleção serão anexadas aqui quando o catálogo (Módulo 2)
 * estiver implementado, consultando o repositório de produtos publicados.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
