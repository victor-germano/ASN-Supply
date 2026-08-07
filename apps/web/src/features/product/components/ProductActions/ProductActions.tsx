'use client';

import { useMemo, useState } from 'react';
import { Button, Text } from '@asn/ui';
import type { ProductDetail } from '@asn/types';
import { useCartStore } from '@/stores/cartStore';
import { useWishlistStore } from '@/stores/wishlistStore';
import { HeartIcon, ShareIcon } from '@/components/icons';

export function ProductActions({ product }: { product: ProductDetail }) {
  const colors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const variant of product.variants) {
      if (!seen.has(variant.colorName)) seen.set(variant.colorName, variant.colorHex);
    }
    return Array.from(seen.entries()).map(([name, hex]) => ({ name, hex }));
  }, [product.variants]);

  const [selectedColor, setSelectedColor] = useState(colors[0]?.name ?? '');
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const sizesForColor = useMemo(
    () => product.variants.filter((variant) => variant.colorName === selectedColor),
    [product.variants, selectedColor],
  );

  const selectedVariant = sizesForColor.find((variant) => variant.size === selectedSize) ?? null;

  const addItem = useCartStore((state) => state.addItem);
  const isFavorited = useWishlistStore((state) => state.productIds.includes(product.id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  function handleAddToCart() {
    if (!selectedVariant) {
      setFeedback('Escolha um tamanho antes de continuar.');
      return;
    }
    addItem(
      {
        variantId: selectedVariant.id,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        imageUrl: product.primaryImage.url,
        size: selectedVariant.size,
        colorName: selectedVariant.colorName,
        unitPriceInCents: (selectedVariant.priceOverride ?? product.price).amountInCents,
      },
      1,
    );
    setFeedback('Adicionado ao carrinho.');
  }

  async function handleShare() {
    const shareData = {
      title: product.name,
      text: `Confira ${product.name} na ASN Supply`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Usuário cancelou o compartilhamento — não é um erro a reportar.
      }
      return;
    }

    await navigator.clipboard.writeText(shareData.url);
    setFeedback('Link copiado para a área de transferência.');
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink">
          Cor — {selectedColor}
        </legend>
        <div className="flex gap-2">
          {colors.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => {
                setSelectedColor(color.name);
                setSelectedSize(null);
              }}
              aria-label={`Cor ${color.name}`}
              aria-current={selectedColor === color.name}
              className={`h-9 w-9 rounded-full border-2 ${
                selectedColor === color.name ? 'border-ink' : 'border-transparent'
              }`}
            >
              <span
                className="block h-full w-full rounded-full border border-ink/15"
                style={{ backgroundColor: color.hex }}
              />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink">
          Tamanho (BR)
        </legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {sizesForColor.map((variant) => {
            const isOutOfStock = variant.stockQuantity === 0;
            return (
              <button
                key={variant.id}
                type="button"
                disabled={isOutOfStock}
                onClick={() => {
                  setSelectedSize(variant.size);
                  setFeedback(null);
                }}
                aria-current={selectedSize === variant.size}
                className={`h-11 border text-sm transition-colors ${
                  selectedSize === variant.size
                    ? 'border-ink bg-ink text-white'
                    : 'border-ink/15 text-ink hover:border-ink'
                } ${isOutOfStock ? 'cursor-not-allowed border-ink/10 text-ink/30 line-through' : ''}`}
              >
                {variant.size}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button size="lg" fullWidth onClick={handleAddToCart}>
          Adicionar ao Carrinho
        </Button>
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={isFavorited}
          className="flex h-14 w-14 shrink-0 items-center justify-center border border-ink/15 text-ink hover:border-ink"
        >
          <HeartIcon filled={isFavorited} className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleShare}
          aria-label="Compartilhar produto"
          className="flex h-14 w-14 shrink-0 items-center justify-center border border-ink/15 text-ink hover:border-ink"
        >
          <ShareIcon className="h-5 w-5" />
        </button>
      </div>

      <Text
        size="sm"
        role="status"
        aria-live="polite"
        className={feedback ? 'text-olive-700' : 'sr-only'}
      >
        {feedback}
      </Text>
    </div>
  );
}
