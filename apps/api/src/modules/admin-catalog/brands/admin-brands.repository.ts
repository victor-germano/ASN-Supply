import { Injectable } from '@nestjs/common';
import type { Brand } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../slugify';
import { toFriendlyError } from '../friendly-error';
import type { CreateBrandDto } from './dto/create-brand.dto';
import type { UpdateBrandDto } from './dto/update-brand.dto';

function toBrand(row: { id: string; name: string; slug: string; logoUrl: string | null }): Brand {
  return { id: row.id, name: row.name, slug: row.slug, logoUrl: row.logoUrl };
}

@Injectable()
export class AdminBrandsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Brand[]> {
    const brands = await this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
    return brands.map(toBrand);
  }

  /** Slug gerado do nome; em colisão, sufixa `-2`, `-3`... — mesmo padrão de `AdminProductsRepository`. */
  private async uniqueSlugFor(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.brand.findUnique({ where: { slug: candidate }, select: { id: true } })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  async create(dto: CreateBrandDto): Promise<Brand> {
    const slug = await this.uniqueSlugFor(dto.name);
    const brand = await this.prisma.brand.create({
      data: { name: dto.name, slug, logoUrl: dto.logoUrl ?? null },
    });
    return toBrand(brand);
  }

  async update(id: string, dto: UpdateBrandDto): Promise<Brand> {
    try {
      const brand = await this.prisma.brand.update({
        where: { id },
        data: { name: dto.name, logoUrl: dto.logoUrl },
      });
      return toBrand(brand);
    } catch (error) {
      throw toFriendlyError(error, 'Marca');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.brand.delete({ where: { id } });
    } catch (error) {
      throw toFriendlyError(error, 'Marca');
    }
  }
}
