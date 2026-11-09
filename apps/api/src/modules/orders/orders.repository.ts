import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FieldValue, Timestamp, type Transaction } from 'firebase-admin/firestore';
import type {
  CreateOrderItemInput,
  Order,
  OrderItem,
  OrderStatus,
  PaginatedResult,
  ShippingMethod,
  UpdateOrderInput,
} from '@asn/types';
import { FirestoreService } from '../firestore/firestore.service';
import { toMoney } from '../../common/money.mapper';
import { parseGlobalVariantId } from '../../common/variant-id';
import { calculateShippingCostInCents } from './shipping';
import { generateOrderCode } from './order-code';
import type { ShippingAddressDto } from './dto/shipping-address.dto';
import { AddressesRepository } from '../addresses/addresses.repository';
import {
  calculateCouponDiscountInCents,
  couponDocToRecord,
  validateCoupon,
  type CouponDoc,
} from './coupon';
import { isOrderCancellableStatus } from './cancellation';

/** Sem `slug`: o id do documento já É o slug (ver `AdminProductsRepository`) — nunca duplicado como campo. */
interface ProductDoc {
  name: string;
  priceInCents: number;
  isPublished: boolean;
}

interface VariantDoc {
  size: string;
  colorName: string;
  stockQuantity: number;
  priceOverrideInCents: number | null;
}

interface ImageDoc {
  url: string;
  position: number;
}

interface OrderItemDoc {
  productId: string | null;
  productSlug: string;
  productName: string;
  variantId: string | null;
  imageUrl: string;
  size: string;
  colorName: string;
  quantity: number;
  unitPriceInCents: number;
}

interface OrderDoc {
  code: string;
  userId: string | null;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  addressId: string | null;
  shippingRecipientName: string;
  shippingStreet: string;
  shippingNumber: string;
  shippingComplement: string | null;
  shippingNeighborhood: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingMethod: ShippingMethod;
  status: OrderStatus;
  subtotalInCents: number;
  shippingCostInCents: number;
  discountInCents: number;
  totalInCents: number;
  couponId: string | null;
  installments: number;
  createdAt: Timestamp;
  estimatedDeliveryAt: Timestamp | null;
  trackingCode: string | null;
  trackingUrl: string | null;
}

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
  shippingAddress?: ShippingAddressDto;
  shippingMethod: ShippingMethod;
  couponCode?: string;
}

/** Sinal interno pra `createWithRetry` tentar de novo com outro código — nunca escapa pro caller. */
class OrderCodeCollisionError extends Error {}

@Injectable()
export class OrdersRepository {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly addressesRepository: AddressesRepository,
  ) {}

  /**
   * Cria o pedido revalidando tudo no servidor: o client manda só
   * variantId+quantidade, preço e estoque vêm sempre do banco, nunca do
   * request. Transação do Firestore (`runTransaction`) no lugar da
   * transação do Postgres — sempre serializável, com retry automático em
   * contenção. Como o Firestore exige todas as leituras antes de qualquer
   * escrita numa transação, o corpo abaixo é dividido em três fases
   * (leitura, validação/cálculo, escrita), nessa ordem — diferente da
   * versão Postgres, que intercalava leitura e escrita por item.
   */
  async create(data: CreateOrderData): Promise<Order> {
    const quantityByVariantId = new Map<string, number>();
    for (const item of data.items) {
      quantityByVariantId.set(
        item.variantId,
        (quantityByVariantId.get(item.variantId) ?? 0) + item.quantity,
      );
    }
    const variantIds = Array.from(quantityByVariantId.keys());

    const refs = variantIds.map((id) => {
      const parsed = parseGlobalVariantId(id);
      if (!parsed) return { id, productSlug: null, localVariantId: null };
      return { id, productSlug: parsed.productSlug, localVariantId: parsed.localVariantId };
    });

    const [prefetch, shippingAddress] = await Promise.all([
      Promise.all(
        refs.map(async (ref) => {
          if (!ref.productSlug || !ref.localVariantId) {
            return { ...ref, product: null, variant: null };
          }
          const productRef = this.firestore.db.collection('products').doc(ref.productSlug);
          const [productSnap, variantSnap] = await Promise.all([
            productRef.get(),
            productRef.collection('variants').doc(ref.localVariantId).get(),
          ]);
          return {
            ...ref,
            product: productSnap.exists ? (productSnap.data() as ProductDoc) : null,
            variant: variantSnap.exists ? (variantSnap.data() as VariantDoc) : null,
          };
        }),
      ),
      this.resolveShippingAddress(data),
    ]);

    const missingIds = prefetch.filter((p) => !p.product || !p.variant).map((p) => p.id);
    if (missingIds.length > 0) {
      throw new BadRequestException({
        errorCode: 'VARIANT_NOT_FOUND',
        message:
          'Um ou mais itens do carrinho não existem mais. Atualize a página e tente de novo.',
      });
    }

    const unavailable = prefetch.find((p) => !p.product!.isPublished);
    if (unavailable) {
      throw new BadRequestException({
        errorCode: 'PRODUCT_UNAVAILABLE',
        message: `"${unavailable.product!.name}" não está mais disponível.`,
      });
    }

    for (const entry of prefetch) {
      const requestedQuantity = quantityByVariantId.get(entry.id)!;
      if (requestedQuantity > entry.variant!.stockQuantity) {
        throw new ConflictException({
          errorCode: 'INSUFFICIENT_STOCK',
          message:
            entry.variant!.stockQuantity > 0
              ? `Estoque insuficiente para "${entry.product!.name}" (${entry.variant!.colorName}, tam. ${entry.variant!.size}). Disponível: ${entry.variant!.stockQuantity}.`
              : `"${entry.product!.name}" (${entry.variant!.colorName}, tam. ${entry.variant!.size}) está sem estoque.`,
        });
      }
    }

    const result = await this.createWithRetry(async (tx, orderCode) => {
      // --- FASE 1: leituras (reler dentro da transação — preço/estoque
      // vigentes no instante do commit, não os de alguns milissegundos atrás) ---
      const itemRefs = prefetch.map((entry) => {
        const productRef = this.firestore.db.collection('products').doc(entry.productSlug!);
        return {
          entry,
          productRef,
          variantRef: productRef.collection('variants').doc(entry.localVariantId!),
          imagesQuery: productRef.collection('images').orderBy('position', 'asc').limit(1),
        };
      });
      const itemReads = await Promise.all(
        itemRefs.map(async ({ productRef, variantRef, imagesQuery }) => {
          const [productSnap, variantSnap, imagesSnap] = await Promise.all([
            tx.get(productRef),
            tx.get(variantRef),
            tx.get(imagesQuery),
          ]);
          return { productSnap, variantSnap, imagesSnap };
        }),
      );

      const couponCode = data.couponCode?.trim().toUpperCase();
      const couponRef = couponCode ? this.firestore.db.collection('coupons').doc(couponCode) : null;
      const couponSnap = couponRef ? await tx.get(couponRef) : null;

      const orderCodeRef = this.firestore.db.collection('orderCodes').doc(orderCode);
      const orderCodeSnap = await tx.get(orderCodeRef);

      // --- FASE 2: validação + cálculo (sem leitura nem escrita no Firestore) ---
      const orderItemsData: OrderItemDoc[] = [];
      for (let i = 0; i < itemRefs.length; i += 1) {
        const { entry } = itemRefs[i]!;
        const { productSnap, variantSnap, imagesSnap } = itemReads[i]!;
        if (!productSnap.exists || !variantSnap.exists) {
          throw new ConflictException({
            errorCode: 'VARIANT_NOT_FOUND',
            message:
              'Um ou mais itens do carrinho não existem mais. Atualize a página e tente de novo.',
          });
        }
        const product = productSnap.data() as ProductDoc;
        const variant = variantSnap.data() as VariantDoc;
        const quantity = quantityByVariantId.get(entry.id)!;
        if (quantity > variant.stockQuantity) {
          throw new ConflictException({
            errorCode: 'INSUFFICIENT_STOCK',
            message: `O estoque de "${product.name}" mudou enquanto você finalizava a compra. Revise seu carrinho.`,
          });
        }
        const primaryImage = imagesSnap.docs[0]?.data() as ImageDoc | undefined;
        const unitPriceInCents = variant.priceOverrideInCents ?? product.priceInCents;

        orderItemsData.push({
          productId: entry.productSlug,
          productSlug: entry.productSlug!,
          productName: product.name,
          variantId: entry.id,
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

      let couponId: string | null = null;
      let discountInCents = 0;
      if (couponRef) {
        const couponRecord = couponSnap!.exists
          ? couponDocToRecord(couponSnap!.data() as CouponDoc)
          : null;
        const error = validateCoupon(couponRecord, subtotalInCents);
        if (error) {
          throw new BadRequestException(error);
        }
        couponId = couponRecord!.code;
        discountInCents = calculateCouponDiscountInCents(couponRecord!, subtotalInCents);
        if (
          couponRecord!.maxRedemptions !== null &&
          couponRecord!.redemptionCount >= couponRecord!.maxRedemptions
        ) {
          throw new ConflictException({
            errorCode: 'COUPON_EXHAUSTED',
            message: 'Este cupom atingiu o limite de usos enquanto você finalizava a compra.',
          });
        }
      }

      if (orderCodeSnap.exists) {
        throw new OrderCodeCollisionError();
      }

      const totalInCents = subtotalInCents + shippingCostInCents - discountInCents;

      // --- FASE 3: escritas ---
      for (let i = 0; i < itemRefs.length; i += 1) {
        const quantity = quantityByVariantId.get(itemRefs[i]!.entry.id)!;
        tx.update(itemRefs[i]!.variantRef, { stockQuantity: FieldValue.increment(-quantity) });
      }
      if (couponRef) {
        tx.update(couponRef, { redemptionCount: FieldValue.increment(1) });
      }

      const orderRef = this.firestore.db.collection('orders').doc();
      const orderDoc: OrderDoc = {
        code: orderCode,
        userId: data.userId ?? null,
        guestName: data.guestName.trim(),
        guestEmail: data.guestEmail.trim().toLowerCase(),
        guestPhone: data.guestPhone.trim(),
        addressId: data.addressId ?? null,
        shippingRecipientName: shippingAddress.recipientName.trim(),
        shippingStreet: shippingAddress.street.trim(),
        shippingNumber: shippingAddress.number.trim(),
        shippingComplement: shippingAddress.complement?.trim() || null,
        shippingNeighborhood: shippingAddress.neighborhood.trim(),
        shippingCity: shippingAddress.city.trim(),
        shippingState: shippingAddress.state.trim().toUpperCase(),
        shippingZipCode: shippingAddress.zipCode.trim(),
        shippingMethod: data.shippingMethod,
        status: 'PENDING_PAYMENT',
        subtotalInCents,
        shippingCostInCents,
        discountInCents,
        totalInCents,
        couponId,
        installments: 1,
        createdAt: Timestamp.now(),
        estimatedDeliveryAt: null,
        trackingCode: null,
        trackingUrl: null,
      };
      tx.set(orderRef, orderDoc);
      tx.set(orderCodeRef, { orderId: orderRef.id });

      const items: (OrderItemDoc & { id: string })[] = orderItemsData.map((item) => {
        const itemRef = orderRef.collection('items').doc();
        tx.set(itemRef, item);
        return { id: itemRef.id, ...item };
      });

      return { id: orderRef.id, doc: orderDoc, items };
    });

    return toOrder(result.id, result.doc, result.items);
  }

  /**
   * `code` é sorteado (36^8 combinações — ver `generateOrderCode`); colisão
   * é raríssima mas não impossível. `OrderCodeCollisionError` é o único
   * motivo de retry — qualquer outro erro de negócio (estoque, cupom...)
   * propaga direto, sem tentar de novo.
   */
  private async createWithRetry<T>(
    run: (tx: Transaction, orderCode: string) => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      return await this.firestore.db.runTransaction((tx) => run(tx, generateOrderCode()));
    } catch (error) {
      if (error instanceof OrderCodeCollisionError && attempt < 3) {
        return this.createWithRetry(run, attempt + 1);
      }
      throw error;
    }
  }

  async findByIdWithOwner(id: string): Promise<{ order: Order; ownerId: string | null } | null> {
    const ref = this.firestore.db.collection('orders').doc(id);
    const [snap, itemsSnap] = await Promise.all([ref.get(), ref.collection('items').get()]);
    if (!snap.exists) return null;
    const doc = snap.data() as OrderDoc;
    const items = itemsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderItemDoc) }));
    return { order: toOrder(id, doc, items), ownerId: doc.userId };
  }

  async findManyByUserId(userId: string): Promise<Order[]> {
    const snapshot = await this.firestore.db
      .collection('orders')
      .where('userId', '==', userId)
      .get();
    const entries = snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as OrderDoc }))
      .sort((a, b) => b.data.createdAt.toMillis() - a.data.createdAt.toMillis());

    return Promise.all(
      entries.map(async (entry) => {
        const itemsSnap = await this.firestore.db
          .collection('orders')
          .doc(entry.id)
          .collection('items')
          .get();
        const items = itemsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderItemDoc) }));
        return toOrder(entry.id, entry.data, items);
      }),
    );
  }

  /**
   * Cancelamento pelo próprio cliente — reverte estoque e uso de cupom,
   * nunca só muda o status. `userId` (do JWT, nunca do body) tem que bater
   * com o dono do pedido — 404 (não 403) se não bater ou se o pedido não
   * existir.
   */
  async cancelByCustomer(orderId: string, userId: string): Promise<Order> {
    const orderRef = this.firestore.db.collection('orders').doc(orderId);
    const [orderSnap, itemsSnap] = await Promise.all([
      orderRef.get(),
      orderRef.collection('items').get(),
    ]);
    if (!orderSnap.exists) {
      throw new NotFoundException({
        errorCode: 'ORDER_NOT_FOUND',
        message: 'Pedido não encontrado.',
      });
    }
    const order = orderSnap.data() as OrderDoc;
    if (order.userId !== userId) {
      throw new NotFoundException({
        errorCode: 'ORDER_NOT_FOUND',
        message: 'Pedido não encontrado.',
      });
    }
    if (!isOrderCancellableStatus(order.status)) {
      throw new ConflictException({
        errorCode: 'ORDER_NOT_CANCELLABLE',
        message: 'Este pedido não pode mais ser cancelado — ele já está a caminho.',
      });
    }
    const items = itemsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderItemDoc) }));

    await this.firestore.db.runTransaction(async (tx) => {
      // --- leituras ---
      const variantRefs = items
        .map((item) => {
          // Variante excluída pelo admin depois da compra — não há mais
          // estoque pra devolver (equivalente ao `variantId` virar `null`
          // via `onDelete: SetNull` no Postgres; aqui checamos a existência
          // na hora, já que o Firestore não tem cascade).
          if (!item.variantId) return null;
          const parsed = parseGlobalVariantId(item.variantId);
          if (!parsed) return null;
          return {
            item,
            ref: this.firestore.db
              .collection('products')
              .doc(parsed.productSlug)
              .collection('variants')
              .doc(parsed.localVariantId),
          };
        })
        .filter(
          (
            entry,
          ): entry is {
            item: OrderItemDoc & { id: string };
            ref: FirebaseFirestore.DocumentReference;
          } => entry !== null,
        );

      const variantSnaps = await Promise.all(variantRefs.map(({ ref }) => tx.get(ref)));

      const couponRef = order.couponId
        ? this.firestore.db.collection('coupons').doc(order.couponId)
        : null;
      const couponSnap = couponRef ? await tx.get(couponRef) : null;

      // --- escritas ---
      for (let i = 0; i < variantRefs.length; i += 1) {
        if (!variantSnaps[i]!.exists) continue;
        tx.update(variantRefs[i]!.ref, {
          stockQuantity: FieldValue.increment(variantRefs[i]!.item.quantity),
        });
      }
      if (couponRef && couponSnap?.exists) {
        const redemptionCount = (couponSnap.data() as CouponDoc).redemptionCount;
        if (redemptionCount > 0) {
          tx.update(couponRef, { redemptionCount: FieldValue.increment(-1) });
        }
      }
      tx.update(orderRef, { status: 'CANCELLED' satisfies OrderStatus });
    });

    return toOrder(orderId, { ...order, status: 'CANCELLED' }, items);
  }

  /**
   * Painel Admin — todos os pedidos, não só os de um usuário. Lê a coleção
   * inteira e filtra/pagina em memória (mesmo padrão já usado pras
   * coleções pequenas do catálogo): evita depender de índice composto pro
   * filtro opcional de status, e no volume de uma loja pequena o custo é
   * desprezível.
   */
  async findAllForAdmin(params: {
    page: number;
    pageSize: number;
    status?: OrderStatus;
  }): Promise<PaginatedResult<Order>> {
    const snapshot = await this.firestore.db.collection('orders').get();
    const entries = snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as OrderDoc }))
      .filter((entry) => (params.status ? entry.data.status === params.status : true))
      .sort((a, b) => b.data.createdAt.toMillis() - a.data.createdAt.toMillis());

    const totalItems = entries.length;
    const pageSlice = entries.slice(
      (params.page - 1) * params.pageSize,
      (params.page - 1) * params.pageSize + params.pageSize,
    );

    const items = await Promise.all(
      pageSlice.map(async (entry) => {
        const itemsSnap = await this.firestore.db
          .collection('orders')
          .doc(entry.id)
          .collection('items')
          .get();
        const orderItems = itemsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderItemDoc) }));
        return toOrder(entry.id, entry.data, orderItems);
      }),
    );

    return {
      items,
      page: params.page,
      pageSize: params.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / params.pageSize)),
    };
  }

  async updateForAdmin(id: string, input: UpdateOrderInput): Promise<Order> {
    const ref = this.firestore.db.collection('orders').doc(id);
    const data: Partial<OrderDoc> = {};
    if (input.status !== undefined) data.status = input.status;
    if (input.trackingCode !== undefined) data.trackingCode = input.trackingCode;
    if (input.trackingUrl !== undefined) data.trackingUrl = input.trackingUrl;
    await ref.set(data, { merge: true });

    const [snap, itemsSnap] = await Promise.all([ref.get(), ref.collection('items').get()]);
    const doc = snap.data() as OrderDoc;
    const items = itemsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as OrderItemDoc) }));
    return toOrder(id, doc, items);
  }

  /**
   * Um dos dois, nunca os dois — mesma validação da versão Postgres.
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

function toOrder(id: string, doc: OrderDoc, items: (OrderItemDoc & { id: string })[]): Order {
  return {
    id,
    code: doc.code,
    status: doc.status,
    items: items.map(toOrderItem),
    subtotal: toMoney(doc.subtotalInCents),
    shippingCost: toMoney(doc.shippingCostInCents),
    discount: toMoney(doc.discountInCents),
    total: toMoney(doc.totalInCents),
    shippingMethod: doc.shippingMethod,
    shippingAddress: {
      recipientName: doc.shippingRecipientName,
      street: doc.shippingStreet,
      number: doc.shippingNumber,
      complement: doc.shippingComplement,
      neighborhood: doc.shippingNeighborhood,
      city: doc.shippingCity,
      state: doc.shippingState,
      zipCode: doc.shippingZipCode,
    },
    guestName: doc.guestName,
    guestEmail: doc.guestEmail,
    guestPhone: doc.guestPhone,
    installments: doc.installments,
    createdAt: doc.createdAt.toDate().toISOString(),
    estimatedDeliveryAt: doc.estimatedDeliveryAt?.toDate().toISOString() ?? null,
    trackingCode: doc.trackingCode,
    trackingUrl: doc.trackingUrl,
    // Conservador de propósito: este repositório não sabe quem está
    // pedindo (`OrdersService` sabe, via `requestingUser`) — sempre `false`
    // aqui, sobrescrito pelo service com o valor de verdade antes de
    // devolver a resposta.
    canCancel: false,
  };
}

function toOrderItem(item: OrderItemDoc & { id: string }): OrderItem {
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
