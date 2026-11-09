import { Injectable } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import type { AdminCollection } from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';
import { slugify } from '../slugify';
import { assertDocExists, assertNotReferencedByProducts } from '../firestore-guards';
import type { CreateCollectionDto } from './dto/create-collection.dto';
import type { UpdateCollectionDto } from './dto/update-collection.dto';

interface CollectionDoc {
  name: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  launchedAt: Timestamp | null;
}

function toAdminCollection(id: string, doc: CollectionDoc): AdminCollection {
  return {
    id,
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    coverImageUrl: doc.coverImageUrl,
    coverImageAlt: doc.coverImageAlt,
    launchedAt: doc.launchedAt?.toDate().toISOString() ?? null,
  };
}

@Injectable()
export class AdminCollectionsRepository {
  constructor(private readonly firestore: FirestoreService) {}

  private collection() {
    return this.firestore.db.collection('collections');
  }

  async findAll(): Promise<AdminCollection[]> {
    const snapshot = await this.collection().get();
    return snapshot.docs
      .map((doc) => toAdminCollection(doc.id, doc.data() as CollectionDoc))
      .sort((a, b) => b.id.localeCompare(a.id)); // criadas mais recentemente primeiro (id = slug, aproxima createdAt desc do Postgres o suficiente pra uma lista de admin)
  }

  private async uniqueSlugFor(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 2;
    while ((await this.collection().doc(candidate).get()).exists) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  async create(dto: CreateCollectionDto): Promise<AdminCollection> {
    const slug = await this.uniqueSlugFor(dto.name);
    const doc: CollectionDoc = {
      name: dto.name,
      slug,
      description: dto.description,
      coverImageUrl: dto.coverImageUrl ?? null,
      coverImageAlt: dto.coverImageAlt ?? null,
      launchedAt: dto.launchedAt ? Timestamp.fromDate(new Date(dto.launchedAt)) : null,
    };
    await this.collection().doc(slug).set(doc);
    return toAdminCollection(slug, doc);
  }

  async update(id: string, dto: UpdateCollectionDto): Promise<AdminCollection> {
    await assertDocExists(this.firestore.db, 'collections', id, 'Coleção');

    const data: Partial<CollectionDoc> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.coverImageUrl !== undefined) data.coverImageUrl = dto.coverImageUrl;
    if (dto.coverImageAlt !== undefined) data.coverImageAlt = dto.coverImageAlt;
    if (dto.launchedAt !== undefined) {
      data.launchedAt = dto.launchedAt ? Timestamp.fromDate(new Date(dto.launchedAt)) : null;
    }
    await this.collection().doc(id).set(data, { merge: true });

    if (dto.name !== undefined) {
      await this.propagateNameToProducts(id, dto.name);
    }

    const updated = await this.collection().doc(id).get();
    return toAdminCollection(id, updated.data() as CollectionDoc);
  }

  async delete(id: string): Promise<void> {
    await assertDocExists(this.firestore.db, 'collections', id, 'Coleção');
    await assertNotReferencedByProducts(this.firestore.db, 'collection.slug', id, 'Coleção');
    await this.collection().doc(id).delete();
  }

  private async propagateNameToProducts(collectionSlug: string, name: string): Promise<void> {
    const snapshot = await this.firestore.db
      .collection('products')
      .where('collection.slug', '==', collectionSlug)
      .get();
    if (snapshot.empty) return;

    const batch = this.firestore.db.batch();
    for (const doc of snapshot.docs) {
      batch.set(doc.ref, { collection: { slug: collectionSlug, name } }, { merge: true });
    }
    await batch.commit();
  }
}
