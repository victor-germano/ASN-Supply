import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminBannersController } from './banners/admin-banners.controller';
import { AdminBannersRepository } from './banners/admin-banners.repository';
import { AdminSocialPostsController } from './social-posts/admin-social-posts.controller';
import { AdminSocialPostsRepository } from './social-posts/admin-social-posts.repository';

/**
 * CRUD administrativo de banner (hero da Home) e post da vitrine social —
 * os dois conteúdos de marketing que só tinham leitura pública
 * (`CatalogModule`/`MarketingModule`) e nenhuma forma de o admin
 * cadastrar/editar sem entrar direto no Firestore. Mesmo desenho de
 * `AdminCatalogModule`: um módulo só (os dois recursos são simples e sem
 * sub-recurso), cada um com seu próprio controller/repository.
 */
@Module({
  imports: [AuthModule],
  controllers: [AdminBannersController, AdminSocialPostsController],
  providers: [AdminBannersRepository, AdminSocialPostsRepository],
})
export class AdminMarketingModule {}
