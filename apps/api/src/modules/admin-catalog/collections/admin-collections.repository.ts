import { Injectable } from '@nestjs/common';
import type { AdminCollection } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../slugify';
import { toFriendlyError } from '../friendly-error';
import type { CreateCollectionDto } from './dto/create-collection.dto';
import type { UpdateCollectionDto } from './dto/update-collection.dto';

function toAdminCollection(row: {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  launchedAt: Date | null;
}): AdminCollection {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    coverImageUrl: row.coverImageUrl,
    coverImageAlt: row.coverImageAlt,
    launchedAt: row.launchedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class AdminCollectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminCollection[]> {
    const collections = await this.prisma.collection.findMany({ orderBy: { createdAt: 'desc' } });
    return collections.map(toAdminCollection);
  }

  private async uniqueSlugFor(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.collection.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  async create(dto: CreateCollectionDto): Promise<AdminCollection> {
    const slug = await this.uniqueSlugFor(dto.name);
    const collection = await this.prisma.collection.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl ?? null,
        coverImageAlt: dto.coverImageAlt ?? null,
        launchedAt: dto.launchedAt ? new Date(dto.launchedAt) : null,
      },
    });
    return toAdminCollection(collection);
  }

  async update(id: string, dto: UpdateCollectionDto): Promise<AdminCollection> {
    try {
      const collection = await this.prisma.collection.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          coverImageUrl: dto.coverImageUrl,
          coverImageAlt: dto.coverImageAlt,
          // `undefined` (campo omitido) não mexe no valor atual; `null`
          // explícito "despublica" a coleção; string vira `Date` de verdade.
          launchedAt:
            dto.launchedAt === undefined
              ? undefined
              : dto.launchedAt
                ? new Date(dto.launchedAt)
                : null,
        },
      });
      return toAdminCollection(collection);
    } catch (error) {
      throw toFriendlyError(error, 'Coleção');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.collection.delete({ where: { id } });
    } catch (error) {
      throw toFriendlyError(error, 'Coleção');
    }
  }
}
