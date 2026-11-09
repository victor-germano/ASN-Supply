import { BadRequestException, Injectable } from '@nestjs/common';
import type { AdminCategory } from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';
import { slugify } from '../slugify';
import { assertDocExists, assertNotReferencedByProducts } from '../firestore-guards';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

interface CategoryDoc {
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
}

function toAdminCategory(id: string, doc: CategoryDoc): AdminCategory {
  return {
    id,
    name: doc.name,
    slug: doc.slug,
    parentId: doc.parentId,
    imageUrl: doc.imageUrl,
    imageAlt: doc.imageAlt,
  };
}

@Injectable()
export class AdminCategoriesRepository {
  constructor(private readonly firestore: FirestoreService) {}

  private collection() {
    return this.firestore.db.collection('categories');
  }

  async findAll(): Promise<AdminCategory[]> {
    const snapshot = await this.collection().get();
    return snapshot.docs
      .map((doc) => toAdminCategory(doc.id, doc.data() as CategoryDoc))
      .sort((a, b) => a.name.localeCompare(b.name));
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

  async create(dto: CreateCategoryDto): Promise<AdminCategory> {
    if (dto.parentId) {
      await this.assertNotSelfOrDescendant(dto.parentId, null);
    }
    const slug = await this.uniqueSlugFor(dto.name);
    const doc: CategoryDoc = {
      name: dto.name,
      slug,
      parentId: dto.parentId || null,
      imageUrl: dto.imageUrl ?? null,
      imageAlt: dto.imageAlt ?? null,
    };
    await this.collection().doc(slug).set(doc);
    return toAdminCategory(slug, doc);
  }

  /**
   * `id` é o slug. Igual ao Postgres: `''` (escolhido no form como
   * "nenhuma") vira `null` de verdade; `undefined` (campo omitido do PATCH)
   * não mexe no `parentId` atual.
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<AdminCategory> {
    await assertDocExists(this.firestore.db, 'categories', id, 'Categoria');
    if (dto.parentId) {
      await this.assertNotSelfOrDescendant(dto.parentId, id);
    }

    const data: Partial<CategoryDoc> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.parentId !== undefined) data.parentId = dto.parentId === '' ? null : dto.parentId;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.imageAlt !== undefined) data.imageAlt = dto.imageAlt;
    await this.collection().doc(id).set(data, { merge: true });

    if (dto.name !== undefined) {
      await this.propagateNameToProducts(id, dto.name);
    }

    const updated = await this.collection().doc(id).get();
    return toAdminCategory(id, updated.data() as CategoryDoc);
  }

  async delete(id: string): Promise<void> {
    await assertDocExists(this.firestore.db, 'categories', id, 'Categoria');
    await assertNotReferencedByProducts(this.firestore.db, 'category.slug', id, 'Categoria');
    await this.collection().doc(id).delete();
  }

  private async propagateNameToProducts(categorySlug: string, name: string): Promise<void> {
    const snapshot = await this.firestore.db
      .collection('products')
      .where('category.slug', '==', categorySlug)
      .get();
    if (snapshot.empty) return;

    const batch = this.firestore.db.batch();
    for (const doc of snapshot.docs) {
      batch.set(doc.ref, { category: { slug: categorySlug, name } }, { merge: true });
    }
    await batch.commit();
  }

  /**
   * Evita um ciclo na árvore (categoria virando pai dela mesma, direto ou
   * através de um descendente). `excludeId` é `null` na criação (a categoria
   * ainda não tem id pra comparar).
   */
  private async assertNotSelfOrDescendant(
    candidateParentId: string,
    excludeId: string | null,
  ): Promise<void> {
    if (candidateParentId === excludeId) {
      throw new BadRequestException({
        errorCode: 'INVALID_PARENT',
        message: 'Uma categoria não pode ser pai dela mesma.',
      });
    }
    if (excludeId === null) return;

    let currentId: string | null = candidateParentId;
    while (currentId) {
      if (currentId === excludeId) {
        throw new BadRequestException({
          errorCode: 'INVALID_PARENT',
          message: 'Não é possível escolher uma subcategoria como pai — criaria um ciclo.',
        });
      }
      const snap = await this.collection().doc(currentId).get();
      const data = snap.data() as CategoryDoc | undefined;
      currentId = data?.parentId ?? null;
    }
  }
}
