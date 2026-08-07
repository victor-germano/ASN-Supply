import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global: PrismaService fica disponível em qualquer módulo de
 * feature sem precisar reimportar — reduz boilerplate mantendo uma única
 * fonte de conexão com o banco.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
