import type { PaymentIntentResult } from '@asn/types';

/** Dados mínimos que qualquer gateway precisa para iniciar uma cobrança. */
export interface PaymentIntentOrderInput {
  orderId: string;
  orderCode: string;
  totalInCents: number;
  guestEmail: string;
}

/**
 * Porta de pagamento (Módulo 4): abstração sobre "iniciar uma cobrança",
 * implementada hoje só por `NullPaymentGateway` (sem credenciais de
 * Stripe/Mercado Pago/PIX ainda — ver decisão do usuário). Uma classe
 * abstrata em vez de uma interface porque é o próprio token de injeção do
 * Nest (`{ provide: PaymentGateway, useClass: ... }`), sem precisar de um
 * Symbol/string token separado.
 *
 * Plugar um gateway real no futuro é escrever um novo adapter que implementa
 * `createPaymentIntent` de verdade e trocar o `useClass` em
 * `payments.module.ts` — nenhum outro módulo (orders, controllers,
 * frontend) muda.
 */
export abstract class PaymentGateway {
  abstract createPaymentIntent(order: PaymentIntentOrderInput): Promise<PaymentIntentResult>;
}
