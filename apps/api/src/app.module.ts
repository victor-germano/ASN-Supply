import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { FirestoreModule } from './modules/firestore/firestore.module';
import { AlgoliaModule } from './modules/algolia/algolia.module';
import { HealthModule } from './modules/health/health.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TryOnModule } from './modules/tryon/tryon.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { CartModule } from './modules/cart/cart.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { AdminProductsModule } from './modules/admin-products/admin-products.module';
import { AdminCatalogModule } from './modules/admin-catalog/admin-catalog.module';
import { AdminMarketingModule } from './modules/admin-marketing/admin-marketing.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RecoveryModule } from './modules/recovery/recovery.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        // Limite geral POR VISITANTE (ver `AppThrottlerGuard`) — rotas
        // sensíveis (login, cadastro, checkout) têm limites bem menores via
        // @Throttle() nos controllers. 300 e não 100: cada página do site
        // faz várias chamadas pessoais (sessão, carrinho, pedidos), e um
        // cliente navegando rápido chegava perto de 100/min sozinho.
        ttl: 60_000,
        limit: 300,
      },
    ]),
    FirestoreModule,
    AlgoliaModule,
    HealthModule,
    CatalogModule,
    MarketingModule,
    PaymentsModule,
    OrdersModule,
    TryOnModule,
    UsersModule,
    AuthModule,
    AddressesModule,
    WishlistModule,
    CartModule,
    CouponsModule,
    AdminProductsModule,
    AdminCatalogModule,
    AdminMarketingModule,
    UploadsModule,
    AdminUsersModule,
    AdminDashboardModule,
    ScheduleModule.forRoot(),
    RecoveryModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
