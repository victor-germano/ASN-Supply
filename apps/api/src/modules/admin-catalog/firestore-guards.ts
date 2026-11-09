import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Equivalente Firestore do `toFriendlyError` (P2025/P2003 do Prisma) —
 * compartilhado pelos repositórios admin de marca/categoria/coleção: mesma
 * dupla de checagens (existe? está em uso por algum produto?) que o Postgres
 * resolvia com FK + erro de constraint, agora explícita porque o Firestore
 * não tem FK nenhuma.
 */
export async function assertDocExists(
  db: Firestore,
  collection: string,
  id: string,
  label: string,
): Promise<void> {
  const snap = await db.collection(collection).doc(id).get();
  if (!snap.exists) {
    throw new NotFoundException({
      errorCode: 'NOT_FOUND',
      message: `${label} não encontrada.`,
    });
  }
}

/** `field` é o caminho do snapshot denormalizado em `products`, ex: `'brand.slug'`. */
export async function assertNotReferencedByProducts(
  db: Firestore,
  field: string,
  value: string,
  label: string,
): Promise<void> {
  const snap = await db.collection('products').where(field, '==', value).limit(1).get();
  if (!snap.empty) {
    throw new ConflictException({
      errorCode: 'IN_USE',
      message: `Não é possível excluir: ainda há produtos usando esta ${label.toLowerCase()}.`,
    });
  }
}
