'use client';

import { useEffect, useState } from 'react';
import type { LookItem } from '@asn/types';
import { Heading, Text } from '@asn/ui';
import { getLookItems } from '@/services/product.service';

/**
 * "Complete o look" — peças de outras lojas (Shein, AliExpress, Shopee,
 * Mercado Livre etc.) curadas manualmente para combinar com o tênis
 * escolhido (ver comentário do model `LookItem` no schema Prisma para o
 * porquê de ser curadoria manual, não integração ao vivo). Sem itens
 * cadastrados pra este produto ainda, a seção inteira não renderiza nada —
 * não é um estado de erro, é só "ninguém curou isso ainda".
 *
 * `<img>` em vez de `next/image`: as imagens vêm de domínios arbitrários
 * (cada loja curada tem o seu), então otimização via `next/image` exigiria
 * abrir `remotePatterns` para qualquer host — a mesma trilha que o projeto
 * evitou para fotografia de produto (ver `next.config.js`).
 */
export function CompleteTheLook({ productSlug }: { productSlug: string }) {
  const [items, setItems] = useState<LookItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLookItems(productSlug)
      .then((result) => {
        if (!cancelled) setItems(result);
      })
      .catch(() => {
        // Falha ao buscar não deve derrubar o parecer do Provador que já
        // está na tela — some em silêncio, igual ao caso "sem curadoria".
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [productSlug]);

  if (!items || items.length === 0) return null;

  return (
    <div className="mt-6 border border-ink/10 p-6">
      <Heading as="h2" size="sm" className="mb-1">
        Complete o look
      </Heading>
      <Text size="sm" tone="muted" className="mb-5">
        Peças selecionadas por nós em outras lojas para combinar com este tênis.
      </Text>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.externalUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group block"
            >
              <div className="aspect-square overflow-hidden bg-bone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <Text size="xs" tone="muted" className="mt-2 uppercase tracking-wider">
                {item.platform}
              </Text>
              <Text size="sm" className="leading-snug">
                {item.title}
              </Text>
              <Text size="sm" weight="semibold">
                {item.priceLabel}
              </Text>
            </a>
          </li>
        ))}
      </ul>
      <Text size="xs" tone="muted" className="mt-5">
        Preço exibido no momento da curadoria — confira o valor atualizado na loja de destino antes
        de comprar.
      </Text>
    </div>
  );
}
