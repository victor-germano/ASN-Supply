import { Module } from '@nestjs/common';
import { PaymentGateway } from './payment-gateway';
import { NullPaymentGateway } from './null-payment-gateway';

@Module({
  providers: [{ provide: PaymentGateway, useClass: NullPaymentGateway }],
  exports: [PaymentGateway],
})
export class PaymentsModule {}
