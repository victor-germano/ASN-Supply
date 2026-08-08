import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/client';
import type { CreateOrderItemInput, Order, OrderItem, ShippingMethod } from '@asn/types';
import { PrismaService } from '../prisma/prisma.service';
import { toMoney } from '../../common/money.mapper';
import { calculateShippingCostInCents } from './shipping';
import { generateOrderCode } from './order-code';
import type { ShippingAddressDto } from './dto/shipping-address.dto';

const orderInclude = {
  items: true,
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export interface CreateOrderData {
  items: CreateOrderItemInput[];
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  // Tipo do DTO (não o `ShippingAddress` de @asn/types): `complement` chega
  // opcional/ausente do request, mas é armazenado/retornado como `string |
  // null` — formas diferentes de expressar "sem complemento" em cada ponta.
  shippingAddress: ShippingAddressDto;
  shippingMethod: ShippingMethod;
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

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

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            images: { where: { is360Frame: false }, orderBy: { position: 'asc' }, take: 1 },
          },
        },
      },
    });

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
      const totalInCents = subtotalInCents + shippingCostInCents;

      return tx.order.create({
        data: {
          code: orderCode,
          guestName: data.guestName.trim(),
          guestEmail: data.guestEmail.trim().toLowerCase(),
          guestPhone: data.guestPhone.trim(),
          shippingRecipientName: data.shippingAddress.recipientName.trim(),
          shippingStreet: data.shippingAddress.street.trim(),
          shippingNumber: data.shippingAddress.number.trim(),
          shippingComplement: data.shippingAddress.complement?.trim() || null,
          shippingNeighborhood: data.shippingAddress.neighborhood.trim(),
          shippingCity: data.shippingAddress.city.trim(),
          shippingState: data.shippingAddress.state.trim().toUpperCase(),
          shippingZipCode: data.shippingAddress.zipCode.trim(),
          shippingMethod: data.shippingMethod,
          subtotalInCents,
          shippingCostInCents,
          discountInCents: 0,
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

  async findById(id: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    return order ? toOrder(order) : null;
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
