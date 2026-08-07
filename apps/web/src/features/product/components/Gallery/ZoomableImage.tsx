'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import type { ImageAsset } from '@asn/types';

const ZOOM_SCALE = 2;

export interface ZoomableImageProps {
  image: ImageAsset;
  priority?: boolean;
  onOpenLightbox: () => void;
}

/**
 * Zoom por hover (desktop): a imagem escala seguindo o cursor, com
 * `transform-origin` calculado a partir da posição relativa do mouse —
 * padrão comum em PDPs de moda, sem precisar de biblioteca externa. No
 * touch (sem hover), o clique abre o lightbox em tela cheia — é a forma de
 * "zoom" que faz sentido em uma tela pequena.
 */
export function ZoomableImage({ image, priority = false, onOpenLightbox }: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState('50% 50%');
  const [isZoomed, setIsZoomed] = useState(false);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-bone-200"
      onMouseEnter={() => setIsZoomed(true)}
      onMouseLeave={() => setIsZoomed(false)}
      onMouseMove={handleMouseMove}
      onClick={onOpenLightbox}
      role="button"
      tabIndex={0}
      aria-label={`Ampliar imagem: ${image.alt}`}
      onKeyDown={(event) => {
        // preventDefault no Space: sem isso o div (que não é um <button> de
        // verdade) deixa o navegador rolar a página no scroll padrão da
        // tecla, arrastando a viewport bem no momento em que o lightbox abre.
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenLightbox();
        }
      }}
    >
      <Image
        src={image.url}
        alt={image.alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover transition-transform duration-300 ease-premium"
        style={{
          transform: isZoomed ? `scale(${ZOOM_SCALE})` : 'scale(1)',
          transformOrigin: origin,
        }}
      />
    </div>
  );
}
