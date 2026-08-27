import { Module } from '@nestjs/common';
import { AdminAuthGuard } from './admin-auth.guard';

/**
 * SUPERADO — não é mais importado em `AppModule`. A Área do Cliente
 * (Módulo 5) trouxe `Role.ADMIN` + `JwtAuthGuard`/`RolesGuard`, que é o
 * mecanismo real agora: qualquer controller administrativo futuro deve usar
 * `@UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')` diretamente (ver
 * `modules/auth/guards`), não este `AdminAuthGuard` de bearer-token fixo.
 * O gate de acesso já está de pé do lado do site (`apps/web/src/middleware.ts`,
 * rota oculta `/admin`) — falta só o painel de CRUD em si (Módulo 6).
 * Arquivo mantido (não apagado) só porque exclusão de arquivo foi negada
 * pelo sandbox desta sessão; pode remover a pasta inteira com segurança.
 */
@Module({
  providers: [AdminAuthGuard],
  exports: [AdminAuthGuard],
})
export class AdminModule {}
