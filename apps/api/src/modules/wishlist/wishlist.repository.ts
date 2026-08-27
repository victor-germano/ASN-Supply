import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Acesso cru ao model `WishlistItem` — sem regra de negócio (isso é `WishlistService`). */
@Injectable()
export class WishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProductIdsByUserId(userId: string): Promise<string[]> {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { userId },
      select: { productId: true },
      orderBy: { addedAt: 'desc' },
    });
    return rows.map((row) => row.productId);
  }

  /**
   * `upsert` em vez de `create`: o par (userId, productId) é único
   * (`@@unique` no schema) — sincronizar o mesmo favorito duas vezes (ex:
   * duas abas, ou o merge de login competindo com um toggle manual) não
   * pode virar erro de constraint. Idempotente por natureza, como o
   * `toggle` do lado do cliente já é.
   */
  async add(userId: string, productId: string): Promise<void> {
    await this.prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  }
}
