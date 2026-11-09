import { Injectable, NotFoundException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import type { AdminUserListItem, PaginatedResult, UserRole } from '@asn/types';
import { FirestoreService } from '../firestore/firestore.service';

interface UserDoc {
  name: string;
  email: string;
  role: UserRole;
  emailVerifiedAt: Timestamp | null;
  createdAt: Timestamp;
}

/**
 * `User` migrou pro Firestore na Fase 4 (ver
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md) — mesmo
 * padrão de `AdminProductsRepository`: lê a coleção inteira e filtra/
 * ordena/pagina em memória (evita índice composto só criável pelo
 * Console). Lojas pequenas, coleção pequena.
 *
 * `orderCount` não vem mais de um `_count` de relação Prisma (`Order` saiu
 * do Postgres na Fase 3) — uma contagem nativa do Firestore por usuário,
 * uma por linha da página atual (não da lista inteira).
 */
@Injectable()
export class AdminUsersRepository {
  constructor(private readonly firestore: FirestoreService) {}

  private get users() {
    return this.firestore.db.collection('users');
  }

  async findAll(params: {
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PaginatedResult<AdminUserListItem>> {
    const snapshot = await this.users.get();
    const q = params.q?.trim().toLowerCase();
    const all = snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as UserDoc }))
      .filter(
        (user) =>
          !q ||
          user.data.name.toLowerCase().includes(q) ||
          user.data.email.toLowerCase().includes(q),
      )
      .sort((a, b) => b.data.createdAt.toMillis() - a.data.createdAt.toMillis());

    const totalItems = all.length;
    const page = all.slice((params.page - 1) * params.pageSize, params.page * params.pageSize);
    const items = await Promise.all(page.map((user) => this.toListItem(user.id, user.data)));

    return {
      items,
      page: params.page,
      pageSize: params.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / params.pageSize)),
    };
  }

  async updateRole(id: string, role: UserRole): Promise<AdminUserListItem> {
    const ref = this.users.doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new NotFoundException({
        errorCode: 'USER_NOT_FOUND',
        message: 'Cliente não encontrado.',
      });
    }
    await ref.update({ role });
    return this.toListItem(id, { ...(snap.data() as UserDoc), role });
  }

  private async toListItem(id: string, data: UserDoc): Promise<AdminUserListItem> {
    const orderCount = (
      await this.firestore.db.collection('orders').where('userId', '==', id).count().get()
    ).data().count;
    return {
      id,
      name: data.name,
      email: data.email,
      role: data.role,
      emailVerifiedAt: data.emailVerifiedAt?.toDate().toISOString() ?? null,
      createdAt: data.createdAt.toDate().toISOString(),
      orderCount,
    };
  }
}
