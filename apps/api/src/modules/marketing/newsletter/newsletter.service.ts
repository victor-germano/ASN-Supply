import { Injectable } from '@nestjs/common';
import type { NewsletterSubscribeResult } from '@asn/types';
import { NewsletterRepository } from './newsletter.repository';

@Injectable()
export class NewsletterService {
  constructor(private readonly repository: NewsletterRepository) {}

  /**
   * Idempotente por e-mail: já inscrito não é erro (evita expor se um
   * e-mail já está cadastrado), e um e-mail que já cancelou é reativado em
   * vez de gerar um segundo registro.
   */
  async subscribe(email: string): Promise<NewsletterSubscribeResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.repository.findByEmail(normalizedEmail);

    if (!existing) {
      await this.repository.create(normalizedEmail);
    } else if (existing.unsubscribedAt !== null) {
      await this.repository.resubscribe(normalizedEmail);
    }

    return { subscribed: true };
  }
}
