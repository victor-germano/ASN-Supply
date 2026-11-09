import { Injectable } from '@nestjs/common';
import type { Timestamp } from 'firebase-admin/firestore';
import type { Banner } from '@asn/types';
import { FirestoreService } from '../../firestore/firestore.service';

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

@Injectable()
export class BannersRepository {
  constructor(private readonly firestore: FirestoreService) {}

  /**
   * Banners ativos e dentro da janela de vigência, ordenados para o hero slider.
   *
   * Filtra e ordena em memória em vez de `where(...).orderBy(...)` no Firestore
   * de propósito: essa combinação (igualdade + ordenação por outro campo) exige
   * um índice composto, que só dá pra criar pelo Console (não programaticamente
   * pelo Admin SDK). Como é uma coleção pequena (poucos banners), ler tudo e
   * filtrar em JS é mais simples e não depende de provisionar índice nenhum.
   */
  async findActive(): Promise<Banner[]> {
    const now = Date.now();

    const snapshot = await this.firestore.db.collection('banners').get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as BannerDoc) }))
      .filter((banner) => {
        if (!banner.isActive) return false;
        const startsOk = !banner.startsAt || banner.startsAt.toMillis() <= now;
        const endsOk = !banner.endsAt || banner.endsAt.toMillis() >= now;
        return startsOk && endsOk;
      })
      .sort((a, b) => a.position - b.position)
      .map((banner) => ({
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        ctaLabel: banner.ctaLabel,
        ctaHref: banner.ctaHref,
        imageUrlDesktop: banner.imageUrlDesktop,
        imageUrlMobile: banner.imageUrlMobile,
      }));
  }
}
