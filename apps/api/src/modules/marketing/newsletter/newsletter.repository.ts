import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NewsletterRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.newsletterSubscriber.findUnique({ where: { email } });
  }

  create(email: string) {
    return this.prisma.newsletterSubscriber.create({ data: { email } });
  }

  /** Reativa uma inscrição previamente cancelada, sem perder o histórico do registro. */
  resubscribe(email: string) {
    return this.prisma.newsletterSubscriber.update({
      where: { email },
      data: { unsubscribedAt: null, subscribedAt: new Date() },
    });
  }
}
