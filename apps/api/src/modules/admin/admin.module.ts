import { Module } from '@nestjs/common';
import { AdminAuthGuard } from './admin-auth.guard';

/**
 * Fundação do Painel Administrativo (Módulo 6) — só o guard de proteção
 * por enquanto. Nenhum controller/rota administrativo existe ainda
 * (decisão do usuário: pular a área administrativa por ora, deixar a base
 * pronta para implementação). Quando o primeiro controller admin for
 * escrito, importe `AdminModule` no módulo dele e aplique
 * `@UseGuards(AdminAuthGuard)`.
 */
@Module({
  providers: [AdminAuthGuard],
  exports: [AdminAuthGuard],
})
export class AdminModule {}
