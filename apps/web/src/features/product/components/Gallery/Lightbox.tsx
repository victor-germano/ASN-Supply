'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { ImageAsset } from '@asn/types';
import { CloseIcon, ChevronRightIcon } from '@/components/icons';

export interface LightboxProps {
  images: ImageAsset[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function Lightbox({ images, activeIndex, onClose, onNavigate }: LightboxProps) {
  const image = images[activeIndex]!;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onNavigate((activeIndex + 1) % images.length);
      if (event.key === 'ArrowLeft') onNavigate((activeIndex - 1 + images.length) % images.length);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, images.length, onClose, onNavigate]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Galeria de imagens ampliada"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center text-white"
      >
        <CloseIcon className="h-6 w-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate((activeIndex - 1 + images.length) % images.length);
            }}
            aria-label="Imagem anterior"
            className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-white sm:left-8"
          >
            <ChevronRightIcon className="h-5 w-5 rotate-180" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNavigate((activeIndex + 1) % images.length);
            }}
            aria-label="Próxima imagem"
            className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-white sm:right-8"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </>
      )}

      <div
        className="relative h-full max-h-[85vh] w-full max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <Image src={image.url} alt={image.alt} fill sizes="90vw" className="object-contain" />
      </div>
    </motion.div>
  );
}
