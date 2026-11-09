/**
 * `ProductVariant.id` exposto pela API precisa ser único globalmente — o
 * client manda só `variantId` (sem `productId` junto, ver `PUT
 * /cart/items/:variantId` e `CreateOrderItemInput`), então o id público
 * precisa carregar o produto dentro de si.
 *
 * No Firestore, o documento da variante vive em
 * `products/{slug}/variants/{colorSlug_sizeSlug}` — único só DENTRO do
 * produto, não globalmente. Por isso o id público é
 * `${productSlug}_${colorSlug_sizeSlug}`: `productSlug` nunca contém `_`
 * (gerado por `slugify`, que só produz `-`), então o primeiro `_` sempre
 * separa as duas partes sem ambiguidade — não precisa de nenhuma consulta
 * extra (collection group, índice...) pra descobrir de qual produto uma
 * variante é, só splitar a string.
 */
export function globalVariantId(productSlug: string, localVariantId: string): string {
  return `${productSlug}_${localVariantId}`;
}

export interface ParsedVariantId {
  productSlug: string;
  localVariantId: string;
}

export function parseGlobalVariantId(variantId: string): ParsedVariantId | null {
  const separatorIndex = variantId.indexOf('_');
  if (separatorIndex <= 0 || separatorIndex === variantId.length - 1) return null;
  return {
    productSlug: variantId.slice(0, separatorIndex),
    localVariantId: variantId.slice(separatorIndex + 1),
  };
}
