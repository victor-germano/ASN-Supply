import { Injectable } from '@nestjs/common';
import { FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../../firestore/firestore.service';

export interface NewsletterSubscriberRecord {
  email: string;
  subscribedAt: Date;
  unsubscribedAt: Date | null;
}

@Injectable()
export class NewsletterRepository {
  constructor(private readonly firestore: FirestoreService) {}

  private collection() {
    return this.firestore.db.collection('newsletterSubscribers');
  }

  async findByEmail(email: string): Promise<NewsletterSubscriberRecord | null> {
    const snap = await this.collection().doc(email).get();
    if (!snap.exists) return null;
    const data = snap.data() as {
      email: string;
      subscribedAt: Timestamp;
      unsubscribedAt: Timestamp | null;
    };
    return {
      email: data.email,
      subscribedAt: data.subscribedAt.toDate(),
      unsubscribedAt: data.unsubscribedAt ? data.unsubscribedAt.toDate() : null,
    };
  }

  async create(email: string): Promise<void> {
    await this.collection().doc(email).set({
      email,
      subscribedAt: FieldValue.serverTimestamp(),
      unsubscribedAt: null,
    });
  }

  /** Reativa uma inscrição previamente cancelada, sem perder o histórico do registro. */
  async resubscribe(email: string): Promise<void> {
    await this.collection().doc(email).update({
      unsubscribedAt: null,
      subscribedAt: FieldValue.serverTimestamp(),
    });
  }
}
