import { Injectable } from '@nestjs/common';
import type { Brand } from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';
import { slugify } from '../slugify';
import { assertDocExists, assertNotReferencedByProducts } from '../firestore-guards';
import type { CreateBrandDto } from './dto/create-brand.dto';
import type { UpdateBrandDto } from './dto/update-brand.dto';

interface BrandDoc {
  name: string;
  slug: string;
  logoUrl: string | null;
}

function toBrand(id: string, doc: BrandDoc): Brand {
  return { id, name: doc.name, slug: doc.slug, logoUrl: doc.logoUrl };
}

@Injectable()
export class AdminBrandsRepository {
  constructor(private readonly firestore: FirestoreService) {}

  private collection() {
    return this.firestore.db.collection('brands');
  }

  async findAll(): Promise<Brand[]> {
    const snapshot = await this.collection().get();
    return snapshot.docs
      .map((doc) => toBrand(doc.id, doc.data() as BrandDoc))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** O slug vira o id do documento — em colisão, sufixa `-2`, `-3`... até achar um livre. */
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

  async create(dto: CreateBrandDto): Promise<Brand> {
    const slug = await this.uniqueSlugFor(dto.name);
    const doc: BrandDoc = { name: dto.name, slug, logoUrl: dto.logoUrl ?? null };
    await this.collection().doc(slug).set(doc);
    return toBrand(slug, doc);
  }

  /**
   * `id` aqui é o slug (id do documento). Nome mudou => propaga pro snapshot
   * denormalizado em todo produto desta marca — Firestore não tem
   * `UPDATE ... WHERE` em lote, então é um `where` + `WriteBatch` (até 500
   * por lote; o catálogo nunca chega perto disso).
   */
  async update(id: string, dto: UpdateBrandDto): Promise<Brand> {
    await assertDocExists(this.firestore.db, 'brands', id, 'Marca');

    const data: Partial<BrandDoc> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    await this.collection().doc(id).set(data, { merge: true });

    if (dto.name !== undefined) {
      await this.propagateNameToProducts(id, dto.name);
    }

    const updated = await this.collection().doc(id).get();
    return toBrand(id, updated.data() as BrandDoc);
  }

  async delete(id: string): Promise<void> {
    await assertDocExists(this.firestore.db, 'brands', id, 'Marca');
    await assertNotReferencedByProducts(this.firestore.db, 'brand.slug', id, 'Marca');
    await this.collection().doc(id).delete();
  }

  private async propagateNameToProducts(brandSlug: string, name: string): Promise<void> {
    const snapshot = await this.firestore.db
      .collection('products')
      .where('brand.slug', '==', brandSlug)
      .get();
    if (snapshot.empty) return;

    const batch = this.firestore.db.batch();
    for (const doc of snapshot.docs) {
      batch.set(doc.ref, { brand: { slug: brandSlug, name } }, { merge: true });
    }
    await batch.commit();
  }
}
