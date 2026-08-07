import { Injectable } from '@nestjs/common';
import type { Banner } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BannersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Banners ativos e dentro da janela de vigência, ordenados para o hero slider. */
  async findActive(): Promise<Banner[]> {
    const now = new Date();

    const banners = await this.prisma.banner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { position: 'asc' },
    });

    return banners.map((banner) => ({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      ctaLabel: banner.ctaLabel,
      ctaHref: banner.ctaHref,
      imageUrlDesktop: banner.imageUrlDesktop,
      imageUrlMobile: banner.imageUrlMobile,
    }));
  }
}
