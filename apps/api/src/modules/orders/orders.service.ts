import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser, Order, PaymentIntentResult } from '@asn/types';
import type { EnvConfig } from '../../config/env.validation';
import { OrdersRepository, type CreateOrderData } from './orders.repository';
import { PaymentGateway } from '../payments/payment-gateway';
import { EmailSender } from '../email/email-sender';
import { orderConfirmationEmail } from '../email/templates';

const NOT_FOUND_ERROR = {
  errorCode: 'ORDER_NOT_FOUND',
  message: 'Pedido não encontrado.',
} as const;

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly repository: OrdersRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly emailSender: EmailSender,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  async create(data: CreateOrderData): Promise<Order> {
    const order = await this.repository.create(data);
    // Fire-and-forget: uma falha de envio não pode derrubar uma compra que
    // já foi commitada de verdade (estoque decrementado, pedido criado) —
    // mesmo raciocínio do e-mail de verificação em `AuthService.register`.
    this.sendConfirmationEmail(order).catch((error) =>
      this.logger.error(`Falha ao enviar e-mail de confirmação do pedido ${order.code}: ${error}`),
    );
    return order;
  }

  private async sendConfirmationEmail(order: Order): Promise<void> {
    const orderUrl = `${this.config.get('WEB_APP_URL', { infer: true })}/pedido/${order.id}`;
    const { subject, html } = orderConfirmationEmail({
      orderCode: order.code,
      totalLabel: currencyFormatter.format(order.total.amountInCents / 100),
      orderUrl,
    });
    await this.emailSender.send({ to: order.guestEmail, subject, html });
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
