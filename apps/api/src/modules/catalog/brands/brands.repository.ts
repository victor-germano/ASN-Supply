import { Injectable } from '@nestjs/common';
import type { Brand } from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';

interface BrandDoc {
  name: string;
  slug: string;
  logoUrl: string | null;
}

@Injectable()
export class BrandsRepository {
  constructor(private readonly firestore: FirestoreService) {}

  async findAll(limit: number): Promise<Brand[]> {
    const snapshot = await this.firestore.db.collection('brands').get();
    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as BrandDoc;
        return { id: doc.id, name: data.name, slug: data.slug, logoUrl: data.logoUrl };
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
  }
}
