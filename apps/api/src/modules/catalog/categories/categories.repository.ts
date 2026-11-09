import { Injectable } from '@nestjs/common';
import type { Category } from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';

interface CategoryDoc {
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
}

@Injectable()
export class CategoriesRepository {
  constructor(private readonly firestore: FirestoreService) {}

  /** Categorias de topo (sem pai) com imagem — usadas no grid de categorias da Home. */
  async findTopLevel(): Promise<Category[]> {
    const snapshot = await this.firestore.db.collection('categories').get();

    return snapshot.docs
      .map((doc) => doc.data() as CategoryDoc)
      .filter((category) => category.parentId === null)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((category) => ({
        id: category.slug,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
        image:
          category.imageUrl && category.imageAlt
            ? { url: category.imageUrl, alt: category.imageAlt }
            : null,
      }));
  }
}
