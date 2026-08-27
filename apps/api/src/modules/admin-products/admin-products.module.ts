import { Module } from '@nestjs/common';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { AdminProductsRepository } from './admin-products.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminProductsController],
  providers: [AdminProductsService, AdminProductsRepository],
})
export class AdminProductsModule {}
