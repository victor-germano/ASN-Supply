import type { PaymentIntentResult } from '@asn/types';

/** Mostrado no lugar do PIX quando a etapa de pagamento não respondeu — o pedido em si continua visível. */
export const PAYMENT_UNAVAILABLE_FALLBACK: PaymentIntentResult = {
  available: false,
  method: null,
  providerReference: null,
  clientSecret: null,
  pix: null,
  message:
    'Não foi possível consultar o status do pagamento agora. Recarregue a página em instantes.',
};
