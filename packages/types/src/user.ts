export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPPORT';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
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
