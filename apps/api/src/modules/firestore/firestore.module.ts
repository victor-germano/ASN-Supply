import { Global, Module } from '@nestjs/common';
import { FirestoreService } from './firestore.service';

/**
 * Módulo global: FirestoreService fica disponível em qualquer módulo de
 * feature sem precisar reimportar — mesmo padrão do `PrismaModule`.
 */
@Global()
@Module({
  providers: [FirestoreService],
  exports: [FirestoreService],
})
export class FirestoreModule {}
