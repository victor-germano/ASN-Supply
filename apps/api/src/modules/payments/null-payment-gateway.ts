import { Injectable, Logger } from '@nestjs/common';
import type { PaymentIntentResult } from '@asn/types';
import { PaymentGateway, type PaymentIntentOrderInput } from './payment-gateway';

/**
 * Implementação de `PaymentGateway` enquanto não há credenciais reais de
 * Stripe/Mercado Pago/PIX (decisão explícita do usuário no Módulo 4): o
 * pedido é criado normalmente (`PENDING_PAYMENT`), mas iniciar uma cobrança
 * sempre responde "indisponível" em vez de falhar — o checkout mostra os
 * métodos de pagamento desabilitados com aviso de "em breve" em vez de
 * quebrar ou fingir que um pagamento foi processado.
 */
@Injectable()
export class NullPaymentGateway extends PaymentGateway {
  private readonly logger = new Logger(NullPaymentGateway.name);

  async createPaymentIntent(order: PaymentIntentOrderInput): Promise<PaymentIntentResult> {
    this.logger.log(
      `Pagamento solicitado para o pedido ${order.orderCode} — nenhum gateway configurado ainda.`,
    );

    return {
      available: false,
      method: null,
      providerReference: null,
      clientSecret: null,
      message:
        'Pagamento online ainda não está disponível. Em breve você poderá pagar com cartão, PIX ou Mercado Pago — o pedido já está registrado e aguardando.',
    };
  }
}
