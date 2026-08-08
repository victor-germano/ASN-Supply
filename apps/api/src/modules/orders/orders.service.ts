import { Injectable, NotFoundException } from '@nestjs/common';
import type { Order, PaymentIntentResult } from '@asn/types';
import { OrdersRepository, type CreateOrderData } from './orders.repository';
import { PaymentGateway } from '../payments/payment-gateway';

@Injectable()
export class OrdersService {
  constructor(
    private readonly repository: OrdersRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  create(data: CreateOrderData): Promise<Order> {
    return this.repository.create(data);
  }

  async findById(id: string): Promise<Order> {
    const order = await this.repository.findById(id);
    if (!order) {
      throw new NotFoundException({
        errorCode: 'ORDER_NOT_FOUND',
        message: 'Pedido não encontrado.',
      });
    }
    return order;
  }

  /** Chamado pela etapa de pagamento do checkout — sempre "indisponível" até um gateway real ser plugado. */
  async createPaymentIntent(orderId: string): Promise<PaymentIntentResult> {
    const order = await this.findById(orderId);
    return this.paymentGateway.createPaymentIntent({
      orderId: order.id,
      orderCode: order.code,
      totalInCents: order.total.amountInCents,
      guestEmail: order.guestEmail,
    });
  }
}
