import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/client';
import { WishlistRepository } from './wishlist.repository';

@Injectable()
export class WishlistService {
  constructor(private readonly repository: WishlistRepository) {}

  findAllForUser(userId: string): Promise<string[]> {
    return this.repository.findProductIdsByUserId(userId);
  }

  async add(userId: string, productId: string): Promise<void> {
    try {
      await this.repository.add(userId, productId);
    } catch (error) {
      // P2003 = violação de foreign key — `productId` não existe (id
      // inventado/produto removido). 404 é mais correto que deixar vazar
      // como 500: o cliente mandou uma referência inválida, não caiu um
      // erro interno.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new NotFoundException({
          errorCode: 'PRODUCT_NOT_FOUND',
          message: 'Produto não encontrado.',
        });
      }
      throw error;
    }
  }

  remove(userId: string, productId: string): Promise<void> {
    return this.repository.remove(userId, productId);
  }
}
