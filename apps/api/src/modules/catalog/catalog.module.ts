import { Module } from '@nestjs/common';
import { BannersController } from './banners/banners.controller';
import { BannersRepository } from './banners/banners.repository';
import { ProductsController } from './products/products.controller';
import { ProductsRepository } from './products/products.repository';
import { AiSearchService } from './products/ai-search.service';
import { CollectionsController } from './collections/collections.controller';
import { CollectionsRepository } from './collections/collections.repository';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesRepository } from './categories/categories.repository';
import { BrandsController } from './brands/brands.controller';
import { BrandsRepository } from './brands/brands.repository';
import { ReviewsController } from './reviews/reviews.controller';
import { ReviewsRepository } from './reviews/reviews.repository';
import { QuestionsController } from './questions/questions.controller';
import { QuestionsRepository } from './questions/questions.repository';
import { AuthModule } from '../auth/auth.module';

/**
 * Módulo de catálogo. Cada recurso — banners, produtos, coleções,
 * categorias, marcas, avaliações, perguntas — tem seu próprio
 * controller/repository, sem uma camada de "serviço" intermediária: são
 * consultas diretas sem regra de negócio adicional, então esse passo extra
 * seria indireção sem propósito (avaliar/perguntar são a exceção — têm
 * regra de negócio de verdade, mas ainda cabem no repository sem precisar
 * de um service à parte). Majoritariamente leitura pública; `POST
 * /reviews` e `POST /questions` são as únicas escritas, e exigem conta
 * (`JwtAuthGuard`, ver os controllers). O módulo de administração (Módulo
 * 6, `AdminProductsModule`/`AdminCatalogModule`) cobre as escritas de
 * produto/marca/categoria/coleção — só quem pode publicar catálogo.
 */
@Module({
  imports: [AuthModule],
  controllers: [
    BannersController,
    ProductsController,
    CollectionsController,
    CategoriesController,
    BrandsController,
    ReviewsController,
    QuestionsController,
  ],
  providers: [
    BannersRepository,
    ProductsRepository,
    AiSearchService,
    CollectionsRepository,
    CategoriesRepository,
    BrandsRepository,
    ReviewsRepository,
    QuestionsRepository,
  ],
  // ProductsRepository é reaproveitado fora do catálogo (ex: TryOnModule
  // busca o produto real por id antes de gerar a análise) — evita cada
  // módulo consumidor duplicar a mesma query/mapper.
  exports: [ProductsRepository],
})
export class CatalogModule {}
