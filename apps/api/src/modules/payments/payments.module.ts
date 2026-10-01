import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { PaymentGateway } from './payment-gateway';
import { NullPaymentGateway } from './null-payment-gateway';
import { PixPaymentGateway } from './pix-payment-gateway';

/** Mesmo padrão de `createEmailSender` — o adapter sai da env var presente. */
export function createPaymentGateway(config: ConfigService<EnvConfig, true>): PaymentGateway {
  return config.get('PIX_KEY', { infer: true })
    ? new PixPaymentGateway(config)
    : new NullPaymentGateway();
}

@Module({
  providers: [
    { provide: PaymentGateway, useFactory: createPaymentGateway, inject: [ConfigService] },
  ],
  exports: [PaymentGateway],
})
export class PaymentsModule {}
