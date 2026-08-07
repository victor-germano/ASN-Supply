'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import type { ImageAsset } from '@asn/types';
import { ZoomableImage } from './ZoomableImage';
import { Product360Viewer } from './Product360Viewer';
import { Lightbox } from './Lightbox';
import { PlayIcon, Rotate360Icon } from '@/components/icons';

export interface GalleryProps {
  images: ImageAsset[];
  videoUrl: string | null;
  frames360: ImageAsset[];
  productName: string;
}

type GalleryMode = 'image' | 'video' | '360';

export function Gallery({ images, videoUrl, frames360, productName }: GalleryProps) {
  const [mode, setMode] = useState<GalleryMode>('image');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const hasVideo = Boolean(videoUrl);
  const has360 = frames360.length > 0;

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row">
      <div className="flex gap-3 overflow-x-auto lg:w-20 lg:flex-col lg:overflow-visible">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => {
              setMode('image');
              setActiveIndex(index);
            }}
            aria-label={`Ver imagem ${index + 1} de ${productName}`}
            aria-current={mode === 'image' && activeIndex === index}
            className={`relative aspect-[4/5] w-16 shrink-0 overflow-hidden border lg:w-full ${
              mode === 'image' && activeIndex === index ? 'border-ink' : 'border-transparent'
            }`}
          >
            <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}

        {hasVideo && (
          <button
            type="button"
            onClick={() => setMode('video')}
            aria-label="Ver vídeo do produto"
            aria-current={mode === 'video'}
            className={`relative flex aspect-[4/5] w-16 shrink-0 items-center justify-center overflow-hidden border bg-ink lg:w-full ${
              mode === 'video' ? 'border-ink' : 'border-transparent'
            }`}
          >
            <PlayIcon className="h-5 w-5 text-white" />
          </button>
        )}

        {has360 && (
          <button
            type="button"
            onClick={() => setMode('360')}
            aria-label="Ver giro 360° do produto"
            aria-current={mode === '360'}
            className={`relative flex aspect-[4/5] w-16 shrink-0 items-center justify-center overflow-hidden border bg-bone-200 lg:w-full ${
              mode === '360' ? 'border-ink' : 'border-transparent'
            }`}
          >
            <Rotate360Icon className="h-5 w-5 text-ink" />
          </button>
        )}
      </div>

      <div className="flex-1">
        {mode === 'image' && (
          <ZoomableImage
            image={images[activeIndex]!}
            priority
            onOpenLightbox={() => setIsLightboxOpen(true)}
          />
        )}
        {mode === 'video' && videoUrl && (
          <video
            src={videoUrl}
            controls
            className="aspect-[4/5] w-full bg-ink object-contain"
            aria-label={`Vídeo do produto ${productName}`}
          />
        )}
        {mode === '360' && <Product360Viewer frames={frames360} />}
      </div>

      <AnimatePresence>
        {isLightboxOpen && (
          <Lightbox
            images={images}
            activeIndex={activeIndex}
            onClose={() => setIsLightboxOpen(false)}
            onNavigate={setActiveIndex}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
