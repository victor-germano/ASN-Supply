import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PaymentIntentResult } from '@asn/types';
import type { EnvConfig } from '../../config/env.validation';
import { PaymentGateway, type PaymentIntentOrderInput } from './payment-gateway';
import { buildPixBrCode, toPixTxid } from './pix-brcode';

/**
 * PIX direto na chave da loja (hoje a chave pessoal da proprietária — a
 * ASN ainda não tem CNPJ). Não há gateway no meio, então não existe
 * confirmação automática: o cliente paga pelo app do banco, o valor cai na
 * conta, e o admin marca o pedido como "Pago" em `/admin/pedidos`. O
 * código do pedido vai como `txid`, o que faz ele aparecer no extrato e
 * permite casar pagamento ↔ pedido.
 *
 * Trocar por um gateway com confirmação automática depois (Mercado Pago,
 * Asaas…) é escrever outro adapter — ver `payment-gateway.ts`.
 */
@Injectable()
export class PixPaymentGateway extends PaymentGateway {
  private readonly key: string;
  private readonly receiverName: string;
  private readonly receiverCity: string;
  private readonly holderDisplayName: string | null;

  constructor(config: ConfigService<EnvConfig, true>) {
    super();
    this.key = config.get('PIX_KEY', { infer: true })!;
    this.receiverName = config.get('PIX_RECEIVER_NAME', { infer: true })!;
    this.receiverCity = config.get('PIX_RECEIVER_CITY', { infer: true })!;
    this.holderDisplayName = config.get('PIX_HOLDER_DISPLAY_NAME', { infer: true })?.trim() || null;
  }

  async createPaymentIntent(order: PaymentIntentOrderInput): Promise<PaymentIntentResult> {
    const copyPasteCode = buildPixBrCode({
      key: this.key,
      receiverName: this.receiverName,
      receiverCity: this.receiverCity,
      amountInCents: order.totalInCents,
      txid: order.orderCode,
    });

    return {
      available: true,
      method: 'PIX',
      providerReference: toPixTxid(order.orderCode),
      clientSecret: null,
      pix: {
        copyPasteCode,
        receiverName: this.receiverName,
        amountInCents: order.totalInCents,
        holderDisplayName: this.holderDisplayName,
      },
      message:
        'Pague com PIX pelo app do seu banco, lendo o QR Code ou usando o código copia e cola. Assim que o pagamento for identificado, seu pedido muda para "Pago" e você recebe um aviso.',
    };
  }
}
