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

// ---------------------------------------------------------------------------
// Painel Administrativo — banners e vitrine social
// ---------------------------------------------------------------------------

/** Igual a `Banner` (leitura pública), mais os campos de curadoria que só o admin vê/edita. */
export interface AdminBanner {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string;
  ctaHref: string;
  imageUrlDesktop: string;
  imageUrlMobile: string;
  position: number;
  isActive: boolean;
  /** `null` = sem início definido (já vale a partir de quando for criado). */
  startsAt: string | null;
  /** `null` = sem fim definido (vale indefinidamente). */
  endsAt: string | null;
}
export interface CreateBannerInput {
  title: string;
  subtitle?: string | null;
  ctaLabel: string;
  ctaHref: string;
  imageUrlDesktop: string;
  imageUrlMobile: string;
  position?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}
export type UpdateBannerInput = Partial<CreateBannerInput>;

/** Igual a `SocialPost` (leitura pública), mais `position`/`isActive` — só o admin vê/edita. */
export interface AdminSocialPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption: string | null;
  position: number;
  isActive: boolean;
}
export interface CreateSocialPostInput {
  imageUrl: string;
  permalink: string;
  caption?: string | null;
  position?: number;
  isActive?: boolean;
}
export type UpdateSocialPostInput = Partial<CreateSocialPostInput>;
