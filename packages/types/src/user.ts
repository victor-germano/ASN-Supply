export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPPORT';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  /** `null` = ainda não confirmou o e-mail (ver `EmailVerificationBanner` em `/conta`). */
  emailVerifiedAt: string | null;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

/**
 * Resposta de /auth/register, /auth/login e /auth/refresh — trafega só
 * entre o Server Action do Next e a API (fetch servidor-servidor); o
 * browser nunca vê `accessToken`/`refreshToken` diretamente, só os
 * cookies httpOnly que o Server Action seta a partir daqui.
 */
export interface AuthResponse {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

export interface Review {
  id: string;
  productId: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  comment: string;
  imageUrls: string[];
  videoUrls: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  productId: string;
  variantId: string | null;
  addedAt: string;
}

// ---------------------------------------------------------------------------
// Painel Administrativo — clientes
// ---------------------------------------------------------------------------

/** Linha da listagem de clientes do admin — `orderCount` só pra dar contexto na lista, sem precisar abrir cada pedido. */
export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerifiedAt: string | null;
  createdAt: string;
  orderCount: number;
}

export interface UpdateUserRoleInput {
  role: UserRole;
}
