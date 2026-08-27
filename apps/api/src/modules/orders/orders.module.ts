import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { PaymentsModule } from '../payments/payments.module';
import { AddressesModule } from '../addresses/addresses.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PaymentsModule, AddressesModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
