import type { NewsletterSubscribeResult, SocialPost } from '@asn/types';
import { apiFetch } from './apiClient';
import { serverFetch } from './serverFetch';

export function getSocialPosts(limit: number): Promise<SocialPost[]> {
  return apiFetch<SocialPost[]>('/social-posts', {
    searchParams: { limit },
    revalidateSeconds: 300,
  });
}

export function subscribeToNewsletter(email: string): Promise<NewsletterSubscribeResult> {
  return serverFetch<NewsletterSubscribeResult>('/newsletter/subscribe', {
    init: { method: 'POST', body: JSON.stringify({ email }) },
  });
}
