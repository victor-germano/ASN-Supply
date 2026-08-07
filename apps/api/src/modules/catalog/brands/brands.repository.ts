import { Injectable } from '@nestjs/common';
import type { Brand } from '@asn/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BrandsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(limit: number): Promise<Brand[]> {
    const brands = await this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
      take: limit,
    });

    return brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl,
    }));
  }
}
