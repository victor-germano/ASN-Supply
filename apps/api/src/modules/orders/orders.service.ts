import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser, Order, PaymentIntentResult } from '@asn/types';
import { OrdersRepository, type CreateOrderData } from './orders.repository';
import { PaymentGateway } from '../payments/payment-gateway';

const NOT_FOUND_ERROR = {
  errorCode: 'ORDER_NOT_FOUND',
  message: 'Pedido não encontrado.',
} as const;

@Injectable()
export class OrdersService {
  constructor(
    private readonly repository: OrdersRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  create(data: CreateOrderData): Promise<Order> {
    return this.repository.create(data);
  }

  /**
   * `requestingUser` vem do `OptionalJwtAuthGuard` — pode ser `undefined`
   * (convidado). Pedido de convidado (`ownerId === null`) continua
   * acessível por link direto, como sempre; pedido de um usuário só pode
   * ser visto por ele mesmo — qualquer outro caso devolve 404 (não 403),
   * para não confirmar a existência do pedido a quem não deveria vê-lo.
   */
  async findById(id: string, requestingUser?: AuthenticatedUser): Promise<Order> {
    const result = await this.repository.findByIdWithOwner(id);
    if (!result) {
      throw new NotFoundException(NOT_FOUND_ERROR);
    }
    const belongsToSomeoneElse = result.ownerId !== null && result.ownerId !== requestingUser?.id;
    if (belongsToSomeoneElse) {
      throw new NotFoundException(NOT_FOUND_ERROR);
    }
    return result.order;
  }

  findManyForUser(userId: string): Promise<Order[]> {
    return this.repository.findManyByUserId(userId);
  }

  /**
   * Etapa de pagamento do checkout — sempre "indisponível" até um gateway
   * real ser plugado (Fase 4). Mesma checagem de posse de `findById`: o
   * mesmo `:id` que `GET /orders/:id` já protege não pode ficar acessível
   * sem essa proteção só porque é outro verbo/rota — sem isso, qualquer
   * pessoa com o cuid de um pedido de terceiros conseguiria ler dados de
   * pagamento dele mesmo sem conseguir ver o pedido em si.
   */
  async createPaymentIntent(
    orderId: string,
    requestingUser?: AuthenticatedUser,
  ): Promise<PaymentIntentResult> {
    const order = await this.findById(orderId, requestingUser);
    return this.paymentGateway.createPaymentIntent({
      orderId: order.id,
      orderCode: order.code,
      totalInCents: order.total.amountInCents,
      guestEmail: order.guestEmail,
    });
  }
}
