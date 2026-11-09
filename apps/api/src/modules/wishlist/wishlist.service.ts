import { Injectable, NotFoundException } from '@nestjs/common';
import { FirestoreService } from '../firestore/firestore.service';
import { WishlistRepository } from './wishlist.repository';

@Injectable()
export class WishlistService {
  constructor(
    private readonly repository: WishlistRepository,
    private readonly firestore: FirestoreService,
  ) {}

  findAllForUser(userId: string): Promise<string[]> {
    return this.repository.findProductIdsByUserId(userId);
  }

  /**
   * `productId` (slug do Firestore) checado explicitamente aqui — a FK do
   * Postgres que fazia essa validação sozinha (P2003 em `productId`
   * inexistente) foi removida junto com a migração de Product pro Firestore
   * (ver C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md).
   */
  async add(userId: string, productId: string): Promise<void> {
    const snap = await this.firestore.db.collection('products').doc(productId).get();
    if (!snap.exists) {
      throw new NotFoundException({
        errorCode: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado.',
      });
    }
    await this.repository.add(userId, productId);
  }

  remove(userId: string, productId: string): Promise<void> {
    return this.repository.remove(userId, productId);
  }
}
