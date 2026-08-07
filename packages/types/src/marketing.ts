/**
 * Conteúdo institucional/marketing exibido na Home (banners do hero,
 * vitrine social, newsletter). Curado manualmente hoje — ver nota em
 * `SocialPost` sobre a futura troca por uma integração ao vivo.
 */
export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string;
  ctaHref: string;
  imageUrlDesktop: string;
  imageUrlMobile: string;
}

/**
 * Post da vitrine social da Home. Hoje alimentado manualmente via
 * `SocialPost` (banco próprio); quando uma conta Instagram Business for
 * conectada, passa a vir da Instagram Graph API sem mudar este contrato.
 */
export interface SocialPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption: string | null;
}

export interface NewsletterSubscribeInput {
  email: string;
}

export interface NewsletterSubscribeResult {
  subscribed: true;
}
