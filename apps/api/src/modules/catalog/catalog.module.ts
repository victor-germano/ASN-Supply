import { Module } from '@nestjs/common';
import { BannersController } from './banners/banners.controller';
import { BannersRepository } from './banners/banners.repository';
import { ProductsController } from './products/products.controller';
import { ProductsRepository } from './products/products.repository';
import { CollectionsController } from './collections/collections.controller';
import { CollectionsRepository } from './collections/collections.repository';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesRepository } from './categories/categories.repository';
import { BrandsController } from './brands/brands.controller';
import { BrandsRepository } from './brands/brands.repository';

/**
 * Módulo de catálogo público (somente leitura nesta fase). Cada recurso —
 * banners, produtos, coleções, categorias, marcas — tem seu próprio
 * controller/repository, sem uma camada de "serviço" intermediária: são
 * consultas diretas sem regra de negócio adicional, então esse passo extra
 * seria indireção sem propósito. O módulo de administração (Módulo 6)
 * reintroduz um `CatalogAdminModule` com use-cases de escrita.
 */
@Module({
  controllers: [
    BannersController,
    ProductsController,
    CollectionsController,
    CategoriesController,
    BrandsController,
  ],
  providers: [
    BannersRepository,
    ProductsRepository,
    CollectionsRepository,
    CategoriesRepository,
    BrandsRepository,
  ],
})
export class CatalogModule {}
