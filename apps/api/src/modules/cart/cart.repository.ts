import { Injectable, NotFoundException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import type { CartItem } from '@asn/types';
import { FirestoreService } from '../firestore/firestore.service';
import { parseGlobalVariantId } from '../../common/variant-id';

interface CartItemDoc {
  productSlug: string;
  localVariantId: string;
  quantity: number;
  addedAt: Timestamp;
}

/** Sem `slug`: o id do documento já É o slug — nunca duplicado como campo (ver `AdminProductsRepository`). */
interface ProductDoc {
  name: string;
  priceInCents: number;
  isPublished: boolean;
}

interface ImageDoc {
  url: string;
  position: number;
  is360Frame: boolean;
}

interface VariantDoc {
  size: string;
  colorName: string;
  priceOverrideInCents: number | null;
}

/**
 * `carts/{userId}` nunca precisa existir como documento — a subcoleção
 * `items` já usa `userId` como chave natural (1 carrinho por usuário, como
 * `Cart.userId @unique` no Postgres), então não há nada pra criar "sob
 * demanda" além do primeiro item em si.
 */
@Injectable()
export class CartRepository {
  constructor(private readonly firestore: FirestoreService) {}

  private items(userId: string) {
    return this.firestore.db.collection('carts').doc(userId).collection('items');
  }

  async findItemsForUser(userId: string): Promise<CartItem[]> {
    const snapshot = await this.items(userId).orderBy('addedAt', 'asc').get();
    if (snapshot.empty) return [];

    const entries = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as CartItemDoc }));
    const results = await Promise.all(
      entries.map(async (entry) => {
        const productRef = this.firestore.db.collection('products').doc(entry.data.productSlug);
        const [productSnap, variantSnap, imagesSnap] = await Promise.all([
          productRef.get(),
          productRef.collection('variants').doc(entry.data.localVariantId).get(),
          productRef.collection('images').orderBy('position', 'asc').limit(1).get(),
        ]);
        // Produto/variante removidos do catálogo depois de adicionados ao
        // carrinho — omitido em vez de quebrar a listagem inteira (mesmo
        // espírito de `withImages` no catálogo).
        if (!productSnap.exists || !variantSnap.exists) return null;

        const product = productSnap.data() as ProductDoc;
        const variant = variantSnap.data() as VariantDoc;
        const primaryImage = imagesSnap.docs[0]?.data() as ImageDoc | undefined;
        const unitPriceInCents = variant.priceOverrideInCents ?? product.priceInCents;

        const item: CartItem = {
          id: entry.id,
          productId: entry.data.productSlug,
          variantId: entry.id,
          productName: product.name,
          productSlug: entry.data.productSlug,
          imageUrl: primaryImage?.url ?? '',
          size: variant.size,
          colorName: variant.colorName,
          quantity: entry.data.quantity,
          unitPrice: { amountInCents: unitPriceInCents, currency: 'BRL' },
          subtotal: { amountInCents: unitPriceInCents * entry.data.quantity, currency: 'BRL' },
        };
        return item;
      }),
    );

    return results.filter((item): item is CartItem => item !== null);
  }

  /** `quantity <= 0` remove o item — mesma semântica de `setQuantity` no `cartStore` do web. */
  async setItemQuantity(userId: string, variantId: string, quantity: number): Promise<void> {
    const ref = this.items(userId).doc(variantId);
    if (quantity <= 0) {
      await ref.delete();
      return;
    }

    const parsed = parseGlobalVariantId(variantId);
    if (!parsed) {
      throw new NotFoundException({
        errorCode: 'VARIANT_NOT_FOUND',
        message: 'Variante de produto não encontrada.',
      });
    }
    const variantSnap = await this.firestore.db
      .collection('products')
      .doc(parsed.productSlug)
      .collection('variants')
      .doc(parsed.localVariantId)
      .get();
    if (!variantSnap.exists) {
      throw new NotFoundException({
        errorCode: 'VARIANT_NOT_FOUND',
        message: 'Variante de produto não encontrada.',
      });
    }

    const existing = await ref.get();
    if (existing.exists) {
      await ref.update({ quantity });
    } else {
      await ref.set({
        productSlug: parsed.productSlug,
        localVariantId: parsed.localVariantId,
        quantity,
        addedAt: Timestamp.now(),
      } satisfies CartItemDoc);
    }
  }

  async removeItem(userId: string, variantId: string): Promise<void> {
    await this.items(userId).doc(variantId).delete();
  }

  async clear(userId: string): Promise<void> {
    const snapshot = await this.items(userId).get();
    if (snapshot.empty) return;
    const batch = this.firestore.db.batch();
    for (const doc of snapshot.docs) batch.delete(doc.ref);
    await batch.commit();
  }
}
