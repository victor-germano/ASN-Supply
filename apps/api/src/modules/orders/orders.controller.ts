import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Order, PaymentIntentResult } from '@asn/types';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  /** Cria o pedido (checkout como convidado) — revalida preço/estoque no servidor, nunca confia no client. */
  @Post()
  // Endpoint público de escrita que cria dados reais (pedido + baixa de
  // estoque em transação) — limite mais restrito que o padrão global, mesmo
  // espírito do throttle em /newsletter/subscribe.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Body() dto: CreateOrderDto): Promise<Order> {
    return this.service.create(dto);
  }

  /**
   * Usado pela página de confirmação (`/pedido/[id]`). Sem autenticação —
   * checkout como convidado não tem conta para amarrar o pedido — mas o
   * `id` é um cuid (alta entropia, impraticável de adivinhar); o throttle
   * aqui é sobre dificultar tentativa de enumeração em massa, não uma
   * garantia de que o link da confirmação é segredo. Autorização de verdade
   * (login, Módulo 5) muda esse modelo quando existir.
   */
  @Get(':id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  findById(@Param('id') id: string): Promise<Order> {
    return this.service.findById(id);
  }

  /** Etapa de pagamento do checkout — hoje sempre retorna indisponível (ver `NullPaymentGateway`). */
  @Post(':id/payment-intent')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createPaymentIntent(@Param('id') id: string): Promise<PaymentIntentResult> {
    return this.service.createPaymentIntent(id);
  }
}
