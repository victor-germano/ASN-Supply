import { Injectable } from '@nestjs/common';
import type { AdminSocialPost } from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';
import { assertDocExists } from '../../admin-catalog/firestore-guards';
import type { CreateSocialPostDto } from './dto/create-social-post.dto';
import type { UpdateSocialPostDto } from './dto/update-social-post.dto';

interface SocialPostDoc {
  imageUrl: string;
  permalink: string;
  caption: string | null;
  position: number;
  isActive: boolean;
}

function toAdminSocialPost(id: string, doc: SocialPostDoc): AdminSocialPost {
  return {
    id,
    imageUrl: doc.imageUrl,
    permalink: doc.permalink,
    caption: doc.caption,
    position: doc.position,
    isActive: doc.isActive,
  };
}

/**
 * CRUD administrativo da vitrine social da Home — mesma coleção
 * `socialPosts` que `SocialPostsRepository` (leitura pública) já lê. ID de
 * documento é auto-gerado, mesmo padrão de `AdminBannersRepository`
 * (nenhum campo natural único pra usar como id).
 */
@Injectable()
export class AdminSocialPostsRepository {
  constructor(private readonly firestore: FirestoreService) {}

  private collection() {
    return this.firestore.db.collection('socialPosts');
  }

  async findAll(): Promise<AdminSocialPost[]> {
    const snapshot = await this.collection().get();
    return snapshot.docs
      .map((doc) => toAdminSocialPost(doc.id, doc.data() as SocialPostDoc))
      .sort((a, b) => a.position - b.position);
  }

  async create(dto: CreateSocialPostDto): Promise<AdminSocialPost> {
    const position = dto.position ?? (await this.collection().get()).size;
    const doc: SocialPostDoc = {
      imageUrl: dto.imageUrl,
      permalink: dto.permalink,
      caption: dto.caption ?? null,
      position,
      isActive: dto.isActive ?? true,
    };
    const ref = this.collection().doc();
    await ref.set(doc);
    return toAdminSocialPost(ref.id, doc);
  }

  async update(id: string, dto: UpdateSocialPostDto): Promise<AdminSocialPost> {
    await assertDocExists(this.firestore.db, 'socialPosts', id, 'Post');

    const data: Record<string, unknown> = {};
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.permalink !== undefined) data.permalink = dto.permalink;
    if (dto.caption !== undefined) data.caption = dto.caption;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    await this.collection().doc(id).set(data, { merge: true });

    const updated = await this.collection().doc(id).get();
    return toAdminSocialPost(id, updated.data() as SocialPostDoc);
  }

  async delete(id: string): Promise<void> {
    await assertDocExists(this.firestore.db, 'socialPosts', id, 'Post');
    await this.collection().doc(id).delete();
  }
}
