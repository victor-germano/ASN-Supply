import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { toMoney } from '../../common/money.mapper';
import type { CartItem } from '@asn/types';

const itemInclude = {
  variant: {
    include: {
      product: {
        include: {
          images: { where: { is360Frame: false }, take: 1, orderBy: { position: 'asc' } },
        },
      },
    },
  },
} satisfies Prisma.CartItemInclude;

type CartItemWithRelations = Prisma.CartItemGetPayload<{ include: typeof itemInclude }>;

function toCartItem(row: CartItemWithRelations): CartItem {
  const unitPriceInCents = row.variant.priceOverrideInCents ?? row.variant.product.priceInCents;
  return {
    id: row.id,
    productId: row.variant.productId,
    variantId: row.variantId,
    productName: row.variant.product.name,
    productSlug: row.variant.product.slug,
    imageUrl: row.variant.product.images[0]?.url ?? '',
    size: row.variant.size,
    colorName: row.variant.colorName,
    quantity: row.quantity,
    unitPrice: toMoney(unitPriceInCents),
    subtotal: toMoney(unitPriceInCents * row.quantity),
  };
}

/**
 * Acesso cru ao model `Cart`/`CartItem` — 1 carrinho por usuário
 * (`Cart.userId @unique`), criado sob demanda no primeiro item, nunca
 * antecipadamente no registro (a maioria das contas nunca chega a ter
 * carrinho salvo — criar cedo demais só seria linha morta no banco).
 */
@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findItemsForUser(userId: string): Promise<CartItem[]> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: itemInclude, orderBy: { addedAt: 'asc' } } },
    });
    return (cart?.items ?? []).map(toCartItem);
  }

  private async findOrCreateCartId(userId: string): Promise<string> {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });
    return cart.id;
  }

  /** `quantity <= 0` remove o item — mesma semântica de `setQuantity` no `cartStore` do web. */
  async setItemQuantity(userId: string, variantId: string, quantity: number): Promise<void> {
    const cartId = await this.findOrCreateCartId(userId);
    if (quantity <= 0) {
      await this.prisma.cartItem.deleteMany({ where: { cartId, variantId } });
      return;
    }
    // `CartItem.productId` é campo próprio (não derivado de `variant` em
    // runtime) — precisa ser lido daqui antes do upsert. `variantId`
    // inventado (ex: sync de um item removido do catálogo) vira 404 já
    // aqui, não uma violação de FK solta no upsert abaixo.
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { productId: true },
    });
    if (!variant) {
      throw new NotFoundException({
        errorCode: 'VARIANT_NOT_FOUND',
        message: 'Variante de produto não encontrada.',
      });
    }
    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      create: { cartId, variantId, quantity, productId: variant.productId },
      update: { quantity },
    });
  }

  async removeItem(userId: string, variantId: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({ where: { userId }, select: { id: true } });
    if (!cart) return;
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
  }

  async clear(userId: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({ where: { userId }, select: { id: true } });
    if (!cart) return;
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
}
