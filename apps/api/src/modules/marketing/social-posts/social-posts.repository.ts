import { Injectable } from '@nestjs/common';
import type { SocialPost } from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';

interface SocialPostDoc {
  imageUrl: string;
  permalink: string;
  caption: string | null;
  position: number;
  isActive: boolean;
}

@Injectable()
export class SocialPostsRepository {
  constructor(private readonly firestore: FirestoreService) {}

  /**
   * Filtra e ordena em memória em vez de `where(...).orderBy(...)` no Firestore
   * de propósito — ver comentário equivalente em `BannersRepository.findActive`.
   */
  async findActive(limit: number): Promise<SocialPost[]> {
    const snapshot = await this.firestore.db.collection('socialPosts').get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as SocialPostDoc) }))
      .filter((post) => post.isActive)
      .sort((a, b) => a.position - b.position)
      .slice(0, limit)
      .map((post) => ({
        id: post.id,
        imageUrl: post.imageUrl,
        permalink: post.permalink,
        caption: post.caption,
      }));
  }
}
