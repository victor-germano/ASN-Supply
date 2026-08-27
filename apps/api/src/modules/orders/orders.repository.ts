import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/client';
import type {
  CreateOrderItemInput,
  Order,
  OrderItem,
  OrderStatus,
  PaginatedResult,
  ShippingMethod,
  UpdateOrderInput,
} from '@asn/types';
import { PrismaService } from '../prisma/prisma.service';
import { toMoney } from '../../common/money.mapper';
import { calculateShippingCostInCents } from './shipping';
import { generateOrderCode } from './order-code';
import type { ShippingAddressDto } from './dto/shipping-address.dto';
import { AddressesRepository } from '../addresses/addresses.repository';
import { calculateCouponDiscountInCents, validateCoupon } from './coupon';
import { isOrderCancellableStatus } from './cancellation';

const orderInclude = {
  items: true,
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export interface CreateOrderData {
  items: CreateOrderItemInput[];
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  /** Vem do JWT (nunca do body) — `undefined` em checkout convidado. */
  userId?: string;
  /**
   * Endereço salvo do cliente autenticado — alternativa a `shippingAddress`.
   * Resolvido (e sua posse conferida) em `resolveShippingAddress` antes de
   * qualquer coisa ser persistida.
   */
  addressId?: string;
  // Tipo do DTO (não o `ShippingAddress` de @asn/types): `complement` chega
  // opcional/ausente do request, mas é armazenado/retornado como `string |
  // null` — formas diferentes de expressar "sem complemento" em cada ponta.
  shippingAddress?: ShippingAddressDto;
  shippingMethod: ShippingMethod;
  couponCode?: string;
}

@Injectable()
export class OrdersRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly addressesRepository: AddressesRepository,
  ) {}

  /**
   * Cria o pedido revalidando tudo no servidor: o client manda só
   * variantId+quantidade, preço e estoque vêm sempre do banco, nunca do
   * request — um client adulterado não consegue comprar por menos nem
   * furar estoque.
   */
  async create(data: CreateOrderData): Promise<Order> {
    // Soma quantidades de variantes repetidas em vez de criar duas linhas
    // para o mesmo item — o client não deveria mandar duplicatas, mas o
    // servidor não confia nisso.
    const quantityByVariantId = new Map<string, number>();
    for (const item of data.items) {
      quantityByVariantId.set(
        item.variantId,
        (quantityByVariantId.get(item.variantId) ?? 0) + item.quantity,
      );
    }
    const variantIds = Array.from(quantityByVariantId.keys());

    // As duas buscas não dependem uma da outra — em paralelo em vez de
    // sequencial economiza uma volta inteira de rede ao banco no caminho
    // mais sensível a latência do checkout.
    const [variants, shippingAddress] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: {
          product: {
            include: {
              images: { where: { is360Frame: false }, orderBy: { position: 'asc' }, take: 1 },
            },
          },
        },
      }),
      // Resolvida em paralelo com os itens: se o endereço salvo não
      // existir/não for do usuário, o Promise.all rejeita e falha rápido
      // antes de a transação chegar a decrementar estoque.
      this.resolveShippingAddress(data),
    ]);

    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    const missingIds = variantIds.filter((id) => !variantById.has(id));
    if (missingIds.length > 0) {
      throw new BadRequestException({
        errorCode: 'VARIANT_NOT_FOUND',
        message:
          'Um ou mais itens do carrinho não existem mais. Atualize a página e tente de novo.',
      });
    }

    const unavailable = variants.find((variant) => !variant.product.isPublished);
    if (unavailable) {
      throw new BadRequestException({
        errorCode: 'PRODUCT_UNAVAILABLE',
        message: `"${unavailable.product.name}" não está mais disponível.`,
      });
    }

    for (const variant of variants) {
      const requestedQuantity = quantityByVariantId.get(variant.id)!;
      if (requestedQuantity > variant.stockQuantity) {
        throw new ConflictException({
          errorCode: 'INSUFFICIENT_STOCK',
          message:
            variant.stockQuantity > 0
              ? `Estoque insuficiente para "${variant.product.name}" (${variant.colorName}, tam. ${variant.size}). Disponível: ${variant.stockQuantity}.`
              : `"${variant.product.name}" (${variant.colorName}, tam. ${variant.size}) está sem estoque.`,
        });
      }
    }

    // Preço e frete são recalculados dentro da transação (não a partir do
    // snapshot acima) para cobrir o caso raro de um preço mudar entre a
    // checagem inicial e o commit — a mesma lógica de "nunca confiar em nada
    // que não seja lido no momento certo" já aplicada ao estoque.
    const order = await this.createWithRetry(async (tx, orderCode) => {
      const orderItemsData: {
        productId: string;
        variantId: string;
        productName: string;
        productSlug: string;
        imageUrl: string;
        size: string;
        colorName: string;
        quantity: number;
        unitPriceInCents: number;
      }[] = [];

      for (const variant of variants) {
        const quantity = quantityByVariantId.get(variant.id)!;
        // Decremento condicional (WHERE stockQuantity >= quantity): se outra
        // compra consumiu o estoque entre a checagem acima e agora, `count`
        // vem 0 e abortamos em vez de vender o que não existe mais.
        const result = await tx.productVariant.updateMany({
          where: { id: variant.id, stockQuantity: { gte: quantity } },
          data: { stockQuantity: { decrement: quantity } },
        });
        if (result.count === 0) {
          throw new ConflictException({
            errorCode: 'INSUFFICIENT_STOCK',
            message: `O estoque de "${variant.product.name}" mudou enquanto você finalizava a compra. Revise seu carrinho.`,
          });
        }

        // Lido de novo (não reaproveitado do `findMany` de fora da
        // transação): garante que o preço cobrado é o vigente no instante
        // do commit, não o de alguns milissegundos atrás.
        const current = await tx.productVariant.findUniqueOrThrow({
          where: { id: variant.id },
          include: { product: { include: { images: { where: { is360Frame: false }, take: 1 } } } },
        });
        const unitPriceInCents = current.priceOverrideInCents ?? current.product.priceInCents;
        const primaryImage = current.product.images[0];

        orderItemsData.push({
          productId: variant.productId,
          variantId: variant.id,
          productName: current.product.name,
          productSlug: current.product.slug,
          // Falha de conteúdo (produto publicado sem imagem de galeria) já é
          // tratada como "omitir da vitrine" no catálogo — aqui, em vez de
          // quebrar uma compra em andamento por causa disso, só a snapshot
          // fica sem imagem.
          imageUrl: primaryImage?.url ?? '',
          size: variant.size,
          colorName: variant.colorName,
          quantity,
          unitPriceInCents,
        });
      }

      const subtotalInCents = orderItemsData.reduce(
        (sum, item) => sum + item.unitPriceInCents * item.quantity,
        0,
      );
      const shippingCostInCents = calculateShippingCostInCents(
        data.shippingMethod,
        subtotalInCents,
      );

      // Aplicação real do cupom (conta como uso, diferente do preview em
      // `CouponsService.preview`) — lido e revalidado do zero AQUI DENTRO
      // da transação, nunca a partir do que o navegador mandou calculado:
      // um client adulterado que mande `couponCode` de um cupom esgotado
      // ou `discountInCents` inventado não consegue nada, porque o valor
      // usado é sempre o recém-calculado a partir do cupom lido agora.
      let couponId: string | null = null;
      let discountInCents = 0;
      if (data.couponCode) {
        const coupon = await tx.coupon.findFirst({
          where: { code: data.couponCode.trim().toUpperCase() },
        });
        const error = validateCoupon(coupon, subtotalInCents);
        if (error) {
          throw new BadRequestException(error);
        }
        couponId = coupon!.id;
        discountInCents = calculateCouponDiscountInCents(coupon!, subtotalInCents);
        // Incremento condicional (mesmo padrão do decremento de estoque
        // acima): sob concorrência, duas compras simultâneas com o último
        // uso restante de um cupom `maxRedemptions` não podem as duas
        // passar — a que perder a corrida cai no `count === 0` e aborta.
        const redemption = await tx.coupon.updateMany({
          where: {
            id: couponId,
            OR: [{ maxRedemptions: null }, { redemptionCount: { lt: coupon!.maxRedemptions! } }],
          },
          data: { redemptionCount: { increment: 1 } },
        });
        if (redemption.count === 0) {
          throw new ConflictException({
            errorCode: 'COUPON_EXHAUSTED',
            message: 'Este cupom atingiu o limite de usos enquanto você finalizava a compra.',
          });
        }
      }

      const totalInCents = subtotalInCents + shippingCostInCents - discountInCents;

      return tx.order.create({
        data: {
          code: orderCode,
          userId: data.userId ?? null,
          addressId: data.addressId ?? null,
          guestName: data.guestName.trim(),
          guestEmail: data.guestEmail.trim().toLowerCase(),
          guestPhone: data.guestPhone.trim(),
          shippingRecipientName: shippingAddress.recipientName.trim(),
          shippingStreet: shippingAddress.street.trim(),
          shippingNumber: shippingAddress.number.trim(),
          shippingComplement: shippingAddress.complement?.trim() || null,
          shippingNeighborhood: shippingAddress.neighborhood.trim(),
          shippingCity: shippingAddress.city.trim(),
          shippingState: shippingAddress.state.trim().toUpperCase(),
          shippingZipCode: shippingAddress.zipCode.trim(),
          shippingMethod: data.shippingMethod,
          subtotalInCents,
          shippingCostInCents,
          couponId,
          discountInCents,
          totalInCents,
          items: { create: orderItemsData },
        },
        include: orderInclude,
      });
    });

    return toOrder(order);
  }

  /**
   * `code` é `@unique` e sorteado (36^8 combinações — ver `generateOrderCode`);
   * colisão é raríssima mas não impossível, e sem retry ela derrubaria a
   * transação inteira (estoque já decrementado incluído) com um 500 genérico
   * em vez de simplesmente tentar de novo com outro código.
   */
  private async createWithRetry(
    run: (tx: Prisma.TransactionClient, orderCode: string) => Promise<OrderWithRelations>,
    attempt = 1,
  ): Promise<OrderWithRelations> {
    try {
      return await this.prisma.$transaction((tx) => run(tx, generateOrderCode()));
    } catch (error) {
      const isCodeCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('code');
      if (isCodeCollision && attempt < 3) {
        return this.createWithRetry(run, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Pedido completo + o `userId` cru (não exposto em `Order`) numa única
   * consulta — usado pelo `OrdersService` tanto para a checagem de posse
   * quanto para montar a resposta, sem precisar de duas idas ao banco para
   * o mesmo request (o `userId` já vem de graça no mesmo `findUnique`;
   * antes disso eram duas queries sequenciais para responder uma coisa só).
   * `null` = pedido não existe.
   */
  async findByIdWithOwner(id: string): Promise<{ order: Order; ownerId: string | null } | null> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    return order ? { order: toOrder(order), ownerId: order.userId } : null;
  }

  async findManyByUserId(userId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(toOrder);
  }

  /**
   * Cancelamento pelo próprio cliente — reverte os dois efeitos colaterais
   * que `create()` causou (estoque decrementado, cupom "gasto"), nunca só
   * muda o status: sem devolver o estoque, cada cancelamento perderia
   * unidades pra sempre; sem devolver o uso do cupom, um cliente que
   * cancelou e recomprou gastaria dois usos por uma compra só.
   *
   * `userId` (do JWT, nunca do body) tem que bater com o dono do pedido —
   * 404 (não 403) se não bater ou se o pedido não existir, mesmo padrão de
   * "não confirmar a existência de recurso de terceiro" já usado em
   * `findById`/`OrdersService`. Status fora de
   * `isOrderCancellableStatus` (ex: já `SHIPPED`) vira `ConflictException`.
   */
  async cancelByCustomer(orderId: string, userId: string): Promise<Order> {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException({
        errorCode: 'ORDER_NOT_FOUND',
        message: 'Pedido não encontrado.',
      });
    }
    if (!isOrderCancellableStatus(existing.status)) {
      throw new ConflictException({
        errorCode: 'ORDER_NOT_CANCELLABLE',
        message: 'Este pedido não pode mais ser cancelado — ele já está a caminho.',
      });
    }

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
      if (existing.couponId) {
        // Condicional (`gt: 0`) só por segurança defensiva — não devia
        // existir um cupom com `redemptionCount` já em 0 tendo sido usado
        // por ESTE pedido, mas decrementar sem checagem arriscaria um
        // contador negativo se essa invariante já tiver sido violada por
        // algum motivo.
        await tx.coupon.updateMany({
          where: { id: existing.couponId, redemptionCount: { gt: 0 } },
          data: { redemptionCount: { decrement: 1 } },
        });
      }
      return tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
        include: orderInclude,
      });
    });

    return toOrder(order);
  }

  /** Painel Admin — todos os pedidos, não só os de um usuário; filtro opcional por status. */
  async findAllForAdmin(params: {
    page: number;
    pageSize: number;
    status?: OrderStatus;
  }): Promise<PaginatedResult<Order>> {
    const where: Prisma.OrderWhereInput = params.status ? { status: params.status } : {};
    const [items, totalItems] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: items.map(toOrder),
      page: params.page,
      pageSize: params.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / params.pageSize)),
    };
  }

  /**
   * Usado pelo painel admin — atualização de status + rastreio (mesmo
   * método, comentado como "Fase 3" desde o Módulo 4, agora estendido).
   * `trackingCode`/`trackingUrl` só substituem o valor atual quando o
   * campo vem definido no input (`!== undefined`) — `PATCH` parcial de
   * verdade, não um `PUT` disfarçado que apagaria o rastreio já salvo se
   * o admin mandar só `{ status: 'DELIVERED' }`.
   */
  async updateForAdmin(id: string, input: UpdateOrderInput): Promise<Order> {
    const order = await this.prisma.order.update({
      where: { id },
      data: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.trackingCode !== undefined && { trackingCode: input.trackingCode }),
        ...(input.trackingUrl !== undefined && { trackingUrl: input.trackingUrl }),
      },
      include: orderInclude,
    });
    return toOrder(order);
  }

  /**
   * Um dos dois, nunca os dois. `CreateOrderDto`'s `@ValidateIf` só evita
   * validar o *formato* de `shippingAddress` quando `addressId` está
   * presente — não impede o client de mandar os dois campos preenchidos ao
   * mesmo tempo. Sem esta checagem aqui, um `shippingAddress` digitado de
   * propósito seria descartado silenciosamente em favor do `addressId`
   * (possivelmente obsoleto) que o client também mandou — em vez disso,
   * rejeitamos explicitamente para o client corrigir o request.
   */
  private async resolveShippingAddress(data: CreateOrderData): Promise<ShippingAddressDto> {
    if (data.addressId && data.shippingAddress) {
      throw new BadRequestException({
        errorCode: 'AMBIGUOUS_SHIPPING_ADDRESS',
        message: 'Informe apenas um endereço de entrega: salvo ou digitado, não os dois.',
      });
    }

    if (data.addressId) {
      if (!data.userId) {
        throw new BadRequestException({
          errorCode: 'ADDRESS_REQUIRES_AUTH',
          message: 'Endereço salvo requer login.',
        });
      }
      // Escopado ao usuário — nunca busca só por id (proteção IDOR: um
      // convidado ou outro usuário não consegue usar o addressId de
      // terceiros só por adivinhar o cuid).
      const address = await this.addressesRepository.findOneForUser(data.addressId, data.userId);
      if (!address) {
        throw new NotFoundException({
          errorCode: 'ADDRESS_NOT_FOUND',
          message: 'Endereço não encontrado.',
        });
      }
      return {
        recipientName: address.recipientName,
        street: address.street,
        number: address.number,
        complement: address.complement ?? undefined,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
      };
    }

    if (!data.shippingAddress) {
      throw new BadRequestException({
        errorCode: 'SHIPPING_ADDRESS_REQUIRED',
        message: 'Informe o endereço de entrega.',
      });
    }
    return data.shippingAddress;
  }
}

function toOrder(order: OrderWithRelations): Order {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    items: order.items.map(toOrderItem),
    subtotal: toMoney(order.subtotalInCents),
    shippingCost: toMoney(order.shippingCostInCents),
    discount: toMoney(order.discountInCents),
    total: toMoney(order.totalInCents),
    shippingMethod: order.shippingMethod,
    shippingAddress: {
      recipientName: order.shippingRecipientName,
      street: order.shippingStreet,
      number: order.shippingNumber,
      complement: order.shippingComplement,
      neighborhood: order.shippingNeighborhood,
      city: order.shippingCity,
      state: order.shippingState,
      zipCode: order.shippingZipCode,
    },
    guestName: order.guestName,
    guestEmail: order.guestEmail,
    guestPhone: order.guestPhone,
    installments: order.installments,
    createdAt: order.createdAt.toISOString(),
    estimatedDeliveryAt: order.estimatedDeliveryAt?.toISOString() ?? null,
    trackingCode: order.trackingCode,
    trackingUrl: order.trackingUrl,
    // Conservador de propósito: este repositório não sabe quem está
    // pedindo (`OrdersService` sabe, via `requestingUser`) — sempre `false`
    // aqui, sobrescrito pelo service com o valor de verdade antes de
    // devolver a resposta. Nunca confie neste campo direto do repositório.
    canCancel: false,
  };
}

function toOrderItem(item: OrderWithRelations['items'][number]): OrderItem {
  return {
    id: item.id,
    productId: item.productId,
    productSlug: item.productSlug,
    productName: item.productName,
    variantId: item.variantId,
    imageUrl: item.imageUrl,
    size: item.size,
    colorName: item.colorName,
    quantity: item.quantity,
    unitPrice: toMoney(item.unitPriceInCents),
  };
}
