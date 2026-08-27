import { BadRequestException, Injectable } from '@nestjs/common';
import type { AdminCategory } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../slugify';
import { toFriendlyError } from '../friendly-error';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

function toAdminCategory(row: {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
}): AdminCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
  };
}

@Injectable()
export class AdminCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminCategory[]> {
    const categories = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    return categories.map(toAdminCategory);
  }

  private async uniqueSlugFor(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  async create(dto: CreateCategoryDto): Promise<AdminCategory> {
    if (dto.parentId) {
      await this.assertNotSelfOrDescendant(dto.parentId, null);
    }
    const slug = await this.uniqueSlugFor(dto.name);
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        parentId: dto.parentId || null,
        imageUrl: dto.imageUrl ?? null,
        imageAlt: dto.imageAlt ?? null,
      },
    });
    return toAdminCategory(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<AdminCategory> {
    // Vazio (`''`, escolhido no form como "nenhuma") vira `null` de
    // verdade — diferente de `undefined` (campo omitido do PATCH, que não
    // deve mexer no `parentId` atual). `PartialType` não distingue os dois
    // por padrão, então a checagem é feita aqui, não no DTO.
    if (dto.parentId) {
      await this.assertNotSelfOrDescendant(dto.parentId, id);
    }
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: {
          name: dto.name,
          parentId: dto.parentId === '' ? null : dto.parentId,
          imageUrl: dto.imageUrl,
          imageAlt: dto.imageAlt,
        },
      });
      return toAdminCategory(category);
    } catch (error) {
      throw toFriendlyError(error, 'Categoria');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      throw toFriendlyError(error, 'Categoria');
    }
  }

  /**
   * Evita um ciclo na árvore (categoria virando pai dela mesma, direto ou
   * através de um descendente) — sem isto, `findTopLevel`/qualquer
   * travessia da árvore de categorias entraria em loop infinito. `excludeId`
   * é `null` na criação (a categoria ainda não tem id pra comparar).
   */
  private async assertNotSelfOrDescendant(
    candidateParentId: string,
    excludeId: string | null,
  ): Promise<void> {
    if (candidateParentId === excludeId) {
      throw new BadRequestException({
        errorCode: 'INVALID_PARENT',
        message: 'Uma categoria não pode ser pai dela mesma.',
      });
    }
    if (excludeId === null) return;
    let current = await this.prisma.category.findUnique({
      where: { id: candidateParentId },
      select: { id: true, parentId: true },
    });
    while (current) {
      if (current.id === excludeId) {
        throw new BadRequestException({
          errorCode: 'INVALID_PARENT',
          message: 'Não é possível escolher uma subcategoria como pai — criaria um ciclo.',
        });
      }
      current = current.parentId
        ? await this.prisma.category.findUnique({
            where: { id: current.parentId },
            select: { id: true, parentId: true },
          })
        : null;
    }
  }
}
