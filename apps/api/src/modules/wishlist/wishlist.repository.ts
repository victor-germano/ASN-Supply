import { Injectable } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../firestore/firestore.service';

interface WishlistItemDoc {
  addedAt: Timestamp;
}

/**
 * Acesso cru à subcoleção `users/{userId}/wishlist/{productId}` — sem
 * regra de negócio (isso é `WishlistService`). Migrado pro Firestore na
 * Fase 5 (ver C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md):
 * o `id` do documento já É o `productId`, o que substitui o
 * `@@unique([userId,productId])` do Postgres de graça — nunca existem dois
 * documentos para o mesmo favorito.
 */
@Injectable()
export class WishlistRepository {
  constructor(private readonly firestore: FirestoreService) {}

  private items(userId: string) {
    return this.firestore.db.collection('users').doc(userId).collection('wishlist');
  }

  async findProductIdsByUserId(userId: string): Promise<string[]> {
    const snapshot = await this.items(userId).get();
    return snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as WishlistItemDoc }))
      .sort((a, b) => b.data.addedAt.toMillis() - a.data.addedAt.toMillis())
      .map((entry) => entry.id);
  }

  /**
   * Idempotente de propósito: sincronizar o mesmo favorito duas vezes (ex:
   * duas abas, ou o merge de login competindo com um toggle manual) nunca
   * pode virar erro — e repetir não deve mexer no `addedAt` original (só a
   * primeira escrita conta), mesmo espírito do `upsert` com `update: {}` de
   * antes.
   */
  async add(userId: string, productId: string): Promise<void> {
    const ref = this.items(userId).doc(productId);
    const snap = await ref.get();
    if (snap.exists) return;
    await ref.set({ addedAt: Timestamp.now() } satisfies WishlistItemDoc);
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.items(userId).doc(productId).delete();
  }
}
