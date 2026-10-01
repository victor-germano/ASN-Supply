import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AuthenticatedUser,
  Order,
  PaginatedResult,
  PaymentIntentResult,
  UpdateOrderInput,
} from '@asn/types';
import type { EnvConfig } from '../../config/env.validation';
import { OrdersRepository, type CreateOrderData } from './orders.repository';
import { PaymentGateway } from '../payments/payment-gateway';
import { EmailSender } from '../email/email-sender';
import { orderConfirmationEmail, orderShippedEmail } from '../email/templates';
import { isOrderCancellableStatus } from './cancellation';

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
    const created = await this.repository.create(data);
    // `data.userId` (não `created`) decide a posse aqui — o repositório
    // sempre devolve `canCancel: false` (não sabe quem pediu, ver
    // `OrdersRepository`); o pedido recém-criado é sempre `PENDING_PAYMENT`
    // (default do schema), então só falta saber se tem dono.
    const order: Order = { ...created, canCancel: data.userId !== undefined };
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
   * ser visto por ele mesmo ou por um ADMIN — qualquer outro caso devolve
   * 404 (não 403), para não confirmar a existência do pedido a quem não
   * deveria vê-lo.
   */
  async findById(id: string, requestingUser?: AuthenticatedUser): Promise<Order> {
    const result = await this.repository.findByIdWithOwner(id);
    if (!result) {
      throw new NotFoundException(NOT_FOUND_ERROR);
    }
    const belongsToSomeoneElse =
      result.ownerId !== null &&
      result.ownerId !== requestingUser?.id &&
      requestingUser?.role !== 'ADMIN';
    if (belongsToSomeoneElse) {
      throw new NotFoundException(NOT_FOUND_ERROR);
    }
    const isOwner = result.ownerId !== null && result.ownerId === requestingUser?.id;
    return {
      ...result.order,
      canCancel: isOwner && isOrderCancellableStatus(result.order.status),
    };
  }

  async findManyForUser(userId: string): Promise<Order[]> {
    const orders = await this.repository.findManyByUserId(userId);
    // Todo pedido aqui já é do próprio `userId` consultado (a query do
    // repositório já filtra por isso) — só falta checar o status pra
    // decidir `canCancel`, sem precisar reconferir posse de novo.
    return orders.map((order) => ({
      ...order,
      canCancel: isOrderCancellableStatus(order.status),
    }));
  }

  /**
   * `userId` vem do JWT (`@CurrentUser()`), nunca do body — a checagem de
   * posse acontece de novo aqui dentro (`OrdersRepository.cancelByCustomer`),
   * mesmo que `canCancel` já tenha decidido mostrar o botão: o campo
   * exposto é só pra UI, a autorização de verdade é sempre revalidada na
   * hora da ação em si.
   */
  cancelForCustomer(orderId: string, userId: string): Promise<Order> {
    return this.repository.cancelByCustomer(orderId, userId);
  }

  findAllForAdmin(params: {
    page: number;
    pageSize: number;
    status?: Order['status'];
  }): Promise<PaginatedResult<Order>> {
    return this.repository.findAllForAdmin(params);
  }

  async updateForAdmin(id: string, input: UpdateOrderInput): Promise<Order> {
    const before = await this.repository.findByIdWithOwner(id);
    if (!before) {
      throw new NotFoundException(NOT_FOUND_ERROR);
    }
    const after = await this.repository.updateForAdmin(id, input);

    // Notifica o cliente só na TRANSIÇÃO pra "enviado" (não a cada PATCH
    // subsequente, ex: admin corrigindo o código de rastreio depois) —
    // mesmo raciocínio de `publishedAt` em `AdminProductsRepository.update`.
    if (before.order.status !== 'SHIPPED' && after.status === 'SHIPPED') {
      this.sendShippedEmail(after).catch((error) =>
        this.logger.error(`Falha ao enviar e-mail de envio do pedido ${after.code}: ${error}`),
      );
    }
    return after;
  }

  private async sendShippedEmail(order: Order): Promise<void> {
    const orderUrl = `${this.config.get('WEB_APP_URL', { infer: true })}/pedido/${order.id}`;
    const { subject, html } = orderShippedEmail({
      orderCode: order.code,
      trackingCode: order.trackingCode,
      orderUrl,
    });
    await this.emailSender.send({ to: order.guestEmail, subject, html });
  }

  /**
   * Etapa de pagamento do checkout. Só pede cobrança ao gateway enquanto o
   * pedido está `PENDING_PAYMENT` — um pedido já pago ou cancelado não
   * pode continuar exibindo um QR Code de PIX válido (o cliente pagaria
   * duas vezes, ou pagaria um pedido cancelado). Mesma checagem de posse de `findById`: o
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
    if (order.status !== 'PENDING_PAYMENT') {
      return {
        available: false,
        method: null,
        providerReference: null,
        clientSecret: null,
        pix: null,
        message:
          order.status === 'CANCELLED'
            ? 'Este pedido foi cancelado — nenhum pagamento é necessário.'
            : order.status === 'REFUND_REQUESTED' || order.status === 'REFUNDED'
              ? 'Este pedido está em processo de reembolso.'
              : 'Pagamento confirmado. Obrigado!',
      };
    }
    return this.paymentGateway.createPaymentIntent({
      orderId: order.id,
      orderCode: order.code,
      totalInCents: order.total.amountInCents,
      guestEmail: order.guestEmail,
    });
  }
}
