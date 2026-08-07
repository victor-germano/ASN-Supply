import { Injectable } from '@nestjs/common';
import type { Category } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Categorias de topo (sem pai) com imagem — usadas no grid de categorias da Home. */
  async findTopLevel(): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      image:
        category.imageUrl && category.imageAlt
          ? { url: category.imageUrl, alt: category.imageAlt }
          : null,
    }));
  }
}
