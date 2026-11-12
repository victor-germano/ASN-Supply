import { Injectable } from '@nestjs/common';
import type { Firestore } from 'firebase-admin/firestore';
import { getDb } from '../../config/firebase-admin';

/**
 * Wrapper fino do Firestore como provider Nest — fica disponível em
 * qualquer módulo de feature via `FirestoreModule` (@Global()). Única
 * fonte de dados da aplicação desde a Fase 7 da migração Postgres→Firestore
 * (ver C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md) — o
 * Prisma/Postgres saiu do projeto inteiro.
 *
 * Sem `bucket`/Storage de propósito: upload de imagem usa Cloudinary (ver
 * `CLOUDINARY_URL`), não o Firebase Storage — decisão tomada por ele exigir
 * o plano pago (Blaze) mesmo dentro da faixa gratuita de uso.
 */
@Injectable()
export class FirestoreService {
  readonly db: Firestore = getDb();
}
