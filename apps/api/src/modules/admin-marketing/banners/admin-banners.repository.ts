import { Injectable } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import type { AdminBanner } from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';
import { assertDocExists } from '../../admin-catalog/firestore-guards';
import type { CreateBannerDto } from './dto/create-banner.dto';
import type { UpdateBannerDto } from './dto/update-banner.dto';

interface BannerDoc {
  title: string;
  subtitle: string | null;
  ctaLabel: string;
  ctaHref: string;
  imageUrlDesktop: string;
  imageUrlMobile: string;
  position: number;
  isActive: boolean;
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
}

function toAdminBanner(id: string, doc: BannerDoc): AdminBanner {
  return {
    id,
    title: doc.title,
    subtitle: doc.subtitle,
    ctaLabel: doc.ctaLabel,
    ctaHref: doc.ctaHref,
    imageUrlDesktop: doc.imageUrlDesktop,
    imageUrlMobile: doc.imageUrlMobile,
    position: doc.position,
    isActive: doc.isActive,
    startsAt: doc.startsAt ? doc.startsAt.toDate().toISOString() : null,
    endsAt: doc.endsAt ? doc.endsAt.toDate().toISOString() : null,
  };
}

/**
 * CRUD administrativo do banner do hero da Home — mesma coleção `banners`
 * que `BannersRepository` (leitura pública) já lê, ver nota lá sobre o
 * filtro/ordenação em memória. ID de documento é auto-gerado (não há
 * slug/nome único pra banner), diferente de marca/categoria/coleção.
 */
@Injectable()
export class AdminBannersRepository {
  constructor(private readonly firestore: FirestoreService) {}

  private collection() {
    return this.firestore.db.collection('banners');
  }

  async findAll(): Promise<AdminBanner[]> {
    const snapshot = await this.collection().get();
    return snapshot.docs
      .map((doc) => toAdminBanner(doc.id, doc.data() as BannerDoc))
      .sort((a, b) => a.position - b.position);
  }

  async create(dto: CreateBannerDto): Promise<AdminBanner> {
    // Sem posição explícita, entra no fim da lista — mesmo comportamento
    // de `imagesArray.append` em `ProductForm` (`position: fields.length`).
    const position = dto.position ?? (await this.collection().get()).size;
    const doc: BannerDoc = {
      title: dto.title,
      subtitle: dto.subtitle ?? null,
      ctaLabel: dto.ctaLabel,
      ctaHref: dto.ctaHref,
      imageUrlDesktop: dto.imageUrlDesktop,
      imageUrlMobile: dto.imageUrlMobile,
      position,
      isActive: dto.isActive ?? true,
      startsAt: dto.startsAt ? Timestamp.fromDate(new Date(dto.startsAt)) : null,
      endsAt: dto.endsAt ? Timestamp.fromDate(new Date(dto.endsAt)) : null,
    };
    const ref = this.collection().doc();
    await ref.set(doc);
    return toAdminBanner(ref.id, doc);
  }

  async update(id: string, dto: UpdateBannerDto): Promise<AdminBanner> {
    await assertDocExists(this.firestore.db, 'banners', id, 'Banner');

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.subtitle !== undefined) data.subtitle = dto.subtitle;
    if (dto.ctaLabel !== undefined) data.ctaLabel = dto.ctaLabel;
    if (dto.ctaHref !== undefined) data.ctaHref = dto.ctaHref;
    if (dto.imageUrlDesktop !== undefined) data.imageUrlDesktop = dto.imageUrlDesktop;
    if (dto.imageUrlMobile !== undefined) data.imageUrlMobile = dto.imageUrlMobile;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.startsAt !== undefined) {
      data.startsAt = dto.startsAt ? Timestamp.fromDate(new Date(dto.startsAt)) : null;
    }
    if (dto.endsAt !== undefined) {
      data.endsAt = dto.endsAt ? Timestamp.fromDate(new Date(dto.endsAt)) : null;
    }
    await this.collection().doc(id).set(data, { merge: true });

    const updated = await this.collection().doc(id).get();
    return toAdminBanner(id, updated.data() as BannerDoc);
  }

  async delete(id: string): Promise<void> {
    await assertDocExists(this.firestore.db, 'banners', id, 'Banner');
    await this.collection().doc(id).delete();
  }
}
