'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { ImageAsset } from '@asn/types';
import { Text } from '@asn/ui';

const DRAG_PX_PER_FRAME = 18;

export function Product360Viewer({ frames }: { frames: ImageAsset[] }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const dragState = useRef<{ startX: number; startFrame: number } | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // O rótulo de acessibilidade promete "use as setas do teclado" assim que o
  // viewer aparece — mas o botão de miniatura que ativa esse modo continua
  // com foco depois do clique, então as setas não fariam nada até o usuário
  // dar Tab de novo (e não há pista de que precisa). Movendo o foco para o
  // slider no mount cumpre o que o aria-label promete.
  useEffect(() => {
    sliderRef.current?.focus();
  }, []);

  function stepBy(delta: number) {
    setFrameIndex((current) => (current + delta + frames.length) % frames.length);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { startX: event.clientX, startFrame: frameIndex };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const deltaX = event.clientX - dragState.current.startX;
    const framesDelta = Math.trunc(deltaX / DRAG_PX_PER_FRAME);
    setFrameIndex(
      (dragState.current.startFrame - framesDelta + frames.length * 100) % frames.length,
    );
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  if (frames.length === 0) return null;
  const frame = frames[frameIndex]!;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={sliderRef}
        className="relative aspect-[4/5] w-full cursor-grab touch-none select-none bg-bone-200 outline-none focus-visible:ring-2 focus-visible:ring-ink active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="slider"
        tabIndex={0}
        aria-label="Giro 360° do produto — arraste para rotacionar, ou use as setas do teclado"
        aria-valuemin={0}
        aria-valuemax={frames.length - 1}
        aria-valuenow={frameIndex}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') stepBy(1);
          if (event.key === 'ArrowLeft') stepBy(-1);
        }}
      >
        <Image
          src={frame.url}
          alt={frame.alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="pointer-events-none object-cover"
          draggable={false}
        />
      </div>
      <Text size="xs" tone="muted" className="text-center">
        Arraste para girar · {frameIndex + 1}/{frames.length}
      </Text>
    </div>
  );
}
