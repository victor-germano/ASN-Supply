import { Injectable } from '@nestjs/common';
import type { Timestamp } from 'firebase-admin/firestore';
import type { Collection } from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';

interface CollectionDoc {
  name: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  launchedAt: Timestamp | null;
}

function toCollection(id: string, doc: CollectionDoc): Collection {
  return {
    id,
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    coverImage:
      doc.coverImageUrl && doc.coverImageAlt
        ? { url: doc.coverImageUrl, alt: doc.coverImageAlt }
        : null,
    launchedAt: doc.launchedAt?.toDate().toISOString() ?? null,
  };
}

@Injectable()
export class CollectionsRepository {
  constructor(private readonly firestore: FirestoreService) {}

  /** Coleções já lançadas, mais recentes primeiro — usado na seção "Coleções" da Home. */
  async findLaunched(limit: number): Promise<Collection[]> {
    const snapshot = await this.firestore.db.collection('collections').get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as CollectionDoc }))
      .filter((entry) => entry.data.launchedAt !== null)
      .sort((a, b) => b.data.launchedAt!.toMillis() - a.data.launchedAt!.toMillis())
      .slice(0, limit)
      .map((entry) => toCollection(entry.id, entry.data));
  }

  /** Usado pela página de coleção (`/colecoes/[slug]`) — `null` se não existir ou ainda não lançada. */
  async findBySlug(slug: string): Promise<Collection | null> {
    const snap = await this.firestore.db.collection('collections').doc(slug).get();
    if (!snap.exists) return null;
    const data = snap.data() as CollectionDoc;
    if (data.launchedAt === null) return null;
    return toCollection(snap.id, data);
  }
}
