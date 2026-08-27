import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './modules/prisma/prisma.module';
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
import { UploadsModule } from './modules/uploads/uploads.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        // Janela e limite conservadores por IP — ajustados por rota
        // sensível (ex: login, checkout) via @Throttle() nos controllers.
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
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
    UploadsModule,
    AdminUsersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
