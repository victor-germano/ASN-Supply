import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminBrandsController } from './brands/admin-brands.controller';
import { AdminBrandsRepository } from './brands/admin-brands.repository';
import { AdminCategoriesController } from './categories/admin-categories.controller';
import { AdminCategoriesRepository } from './categories/admin-categories.repository';
import { AdminCollectionsController } from './collections/admin-collections.controller';
import { AdminCollectionsRepository } from './collections/admin-collections.repository';

/**
 * CRUD administrativo de marca/categoria/coleção — os três "de apoio" que o
 * Painel Admin (Módulo 6, CRUD de produtos) deixou de fora por escopo
 * (só produto, na época). Um módulo só (não três) porque as três entidades
 * são simples o bastante (poucos campos, sem sub-recursos como
 * imagens/variantes de produto) pra não justificar a cerimônia de três
 * módulos Nest separados — cada uma ainda tem seu próprio
 * controller/repository, só a montagem é compartilhada.
 */
@Module({
  imports: [AuthModule],
  controllers: [AdminBrandsController, AdminCategoriesController, AdminCollectionsController],
  providers: [AdminBrandsRepository, AdminCategoriesRepository, AdminCollectionsRepository],
})
export class AdminCatalogModule {}
