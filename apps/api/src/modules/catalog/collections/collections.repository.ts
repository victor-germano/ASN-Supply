import { Injectable } from '@nestjs/common';
import type { Collection } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CollectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Coleções já lançadas, mais recentes primeiro — usado na seção "Coleções" da Home. */
  async findLaunched(limit: number): Promise<Collection[]> {
    const collections = await this.prisma.collection.findMany({
      where: { launchedAt: { not: null } },
      orderBy: { launchedAt: 'desc' },
      take: limit,
    });

    return collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      coverImage:
        collection.coverImageUrl && collection.coverImageAlt
          ? { url: collection.coverImageUrl, alt: collection.coverImageAlt }
          : null,
      launchedAt: collection.launchedAt?.toISOString() ?? null,
    }));
  }
}
