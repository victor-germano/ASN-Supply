import type { NewsletterSubscribeResult, SocialPost } from '@asn/types';
import { apiFetch } from './apiClient';

export function getSocialPosts(limit: number): Promise<SocialPost[]> {
  return apiFetch<SocialPost[]>('/social-posts', {
    searchParams: { limit },
    revalidateSeconds: 300,
  });
}

export function subscribeToNewsletter(email: string): Promise<NewsletterSubscribeResult> {
  return apiFetch<NewsletterSubscribeResult>('/newsletter/subscribe', {
    init: { method: 'POST', body: JSON.stringify({ email }) },
  });
}
