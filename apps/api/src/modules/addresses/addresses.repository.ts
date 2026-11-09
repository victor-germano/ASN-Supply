import { Injectable } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import { FirestoreService } from '../firestore/firestore.service';

export interface AddressRecord {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface CreateAddressData {
  userId: string;
  label: string;
  recipientName: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault?: boolean;
}

export type UpdateAddressData = Partial<Omit<CreateAddressData, 'userId'>>;

interface AddressDoc {
  label: string;
  recipientName: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
  createdAt: Timestamp;
}

/**
 * Acesso cru ao model `Address` — subcoleção `users/{userId}/addresses/{id}`
 * desde a Fase 4 da migração (ver
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md). Proteção
 * contra IDOR (um usuário editando o endereço de outro) é responsabilidade
 * do `AddressesService`, que sempre confirma posse via `findOneForUser`
 * antes de chamar `update`/`delete` por id puro — este repositório não
 * repete essa checagem (e o próprio caminho do documento já exige o
 * `userId` certo para alcançar o endereço).
 *
 * "Só um endereço padrão por usuário" usa uma transação do Firestore em vez
 * do `Serializable` + retry de `P2034` do Postgres — o SDK já resolve
 * contenção com retry automático, não precisa de um `withSerializableRetry`
 * próprio (ver comentário equivalente no plano).
 */
@Injectable()
export class AddressesRepository {
  constructor(private readonly firestore: FirestoreService) {}

  private addresses(userId: string) {
    return this.firestore.db.collection('users').doc(userId).collection('addresses');
  }

  async findManyByUserId(userId: string): Promise<AddressRecord[]> {
    const snapshot = await this.addresses(userId).get();
    return snapshot.docs
      .map((doc) => toAddressRecord(doc.id, userId, doc.data() as AddressDoc))
      .sort((a, b) => {
        const defaultDiff = Number(b.isDefault) - Number(a.isDefault);
        if (defaultDiff !== 0) return defaultDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  async findOneForUser(id: string, userId: string): Promise<AddressRecord | null> {
    const snap = await this.addresses(userId).doc(id).get();
    if (!snap.exists) return null;
    return toAddressRecord(snap.id, userId, snap.data() as AddressDoc);
  }

  async create(data: CreateAddressData): Promise<AddressRecord> {
    const { userId, complement, isDefault, ...rest } = data;
    const ref = this.addresses(userId).doc();
    const doc: AddressDoc = {
      ...rest,
      complement: complement ?? null,
      isDefault: isDefault ?? false,
      createdAt: Timestamp.now(),
    };

    if (!doc.isDefault) {
      await ref.set(doc);
      return toAddressRecord(ref.id, userId, doc);
    }

    // Só um endereço padrão por usuário — zera os outros na mesma
    // transação que cria o novo já marcado como padrão.
    await this.firestore.db.runTransaction(async (tx) => {
      const existing = await tx.get(this.addresses(userId));
      for (const other of existing.docs) {
        if ((other.data() as AddressDoc).isDefault) tx.update(other.ref, { isDefault: false });
      }
      tx.set(ref, doc);
    });
    return toAddressRecord(ref.id, userId, doc);
  }

  async update(id: string, userId: string, data: UpdateAddressData): Promise<AddressRecord> {
    const ref = this.addresses(userId).doc(id);

    if (!data.isDefault) {
      await ref.update(data);
      const snap = await ref.get();
      return toAddressRecord(snap.id, userId, snap.data() as AddressDoc);
    }

    await this.firestore.db.runTransaction(async (tx) => {
      const existing = await tx.get(this.addresses(userId));
      for (const other of existing.docs) {
        if (other.id === id) continue;
        if ((other.data() as AddressDoc).isDefault) tx.update(other.ref, { isDefault: false });
      }
      tx.update(ref, data);
    });
    const snap = await ref.get();
    return toAddressRecord(snap.id, userId, snap.data() as AddressDoc);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.addresses(userId).doc(id).delete();
  }
}

function toAddressRecord(id: string, userId: string, doc: AddressDoc): AddressRecord {
  return {
    id,
    userId,
    label: doc.label,
    recipientName: doc.recipientName,
    street: doc.street,
    number: doc.number,
    complement: doc.complement,
    neighborhood: doc.neighborhood,
    city: doc.city,
    state: doc.state,
    zipCode: doc.zipCode,
    isDefault: doc.isDefault,
    createdAt: doc.createdAt.toDate(),
  };
}
