import { Injectable } from '@nestjs/common';
import type { Firestore } from 'firebase-admin/firestore';
import { getDb } from '../../config/firebase-admin';

/**
 * Wrapper fino do Firestore como provider Nest — mesma função do
 * `PrismaService` para o Postgres, agora para o Firebase. Fica disponível
 * em qualquer módulo de feature via `FirestoreModule` (@Global()).
 *
 * Sem `bucket`/Storage de propósito: upload de imagem usa Cloudinary (ver
 * `CLOUDINARY_URL`), não o Firebase Storage — decisão tomada por ele exigir
 * o plano pago (Blaze) mesmo dentro da faixa gratuita de uso.
 *
 * Migração em andamento: por ora convive com o `PrismaModule`, sem
 * substituir nada ainda — ver plano em
 * C:\Users\vgerm\.claude\plans\refactored-nibbling-corbato.md.
 */
@Injectable()
export class FirestoreService {
  readonly db: Firestore = getDb();
}
