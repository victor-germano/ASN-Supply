import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedUser, Order, PaginatedResult, PaymentIntentResult } from '@asn/types';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ListAdminOrdersQueryDto } from './dto/list-admin-orders.query.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  /**
   * Cria o pedido — convidado ou autenticado na mesma rota
   * (`OptionalJwtAuthGuard`): com token válido, `user` vem preenchido e o
   * `userId` é injetado a partir dele (nunca do body); sem token, segue
   * como checkout convidado, igual antes da Área do Cliente existir.
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  // Endpoint público de escrita que cria dados reais (pedido + baixa de
  // estoque em transação) — limite mais restrito que o padrão global, mesmo
  // espírito do throttle em /newsletter/subscribe.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateOrderDto,
  ): Promise<Order> {
    return this.service.create({ ...dto, userId: user?.id });
  }

  /** Histórico de pedidos do cliente autenticado (Área do Cliente). */
  @Get()
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: AuthenticatedUser): Promise<Order[]> {
    return this.service.findManyForUser(user.id);
  }

  /**
   * Painel Admin — todos os pedidos, filtro opcional por status. Precisa
   * vir antes de `:id` (abaixo) para não ser interpretado como um id de
   * pedido, mesmo raciocínio de `GET /products/by-ids` no catálogo.
   */
  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAllForAdmin(@Query() query: ListAdminOrdersQueryDto): Promise<PaginatedResult<Order>> {
    return this.service.findAllForAdmin(query);
  }

  /**
   * Usado pela página de confirmação (`/pedido/[id]`). `OptionalJwtAuthGuard`
   * porque pedidos de convidado continuam acessíveis por link direto (cuid,
   * alta entropia); pedidos de um usuário autenticado só podem ser vistos
   * por ele mesmo (ou um ADMIN) — ver a checagem em `OrdersService.findById`.
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<Order> {
    return this.service.findById(id, user);
  }

  /** Painel Admin — atualizar status e/ou rastreio (`OrdersService.updateForAdmin`). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateForAdmin(@Param('id') id: string, @Body() dto: UpdateOrderDto): Promise<Order> {
    return this.service.updateForAdmin(id, dto);
  }

  /**
   * Etapa de pagamento do checkout — hoje sempre retorna indisponível (ver
   * `NullPaymentGateway`). Mesma proteção de posse de `findById` (ver
   * comentário lá) — o `:id` é o mesmo recurso, não faz sentido proteger
   * um verbo e deixar o outro aberto.
   */
  @Post(':id/payment-intent')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  createPaymentIntent(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<PaymentIntentResult> {
    return this.service.createPaymentIntent(id, user);
  }
}
