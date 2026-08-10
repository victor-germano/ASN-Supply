'use client';

import { useCallback, useState } from 'react';
import { Text } from '@asn/ui';
import { UploadIcon, CloseIcon } from '@/components/icons';
import { resizeImageToDataUrl } from '../../utils/resizeImage';

// 15MB antes de redimensionar — generoso o bastante para uma foto de
// celular sem processamento nenhum; o resize no client é o que garante que
// o que sai daqui é sempre pequeno, não este limite de entrada.
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface PhotoUploaderProps {
  photoDataUrl: string | null;
  onPhotoChange: (dataUrl: string | null) => void;
}

export function PhotoUploader({ photoDataUrl, onPhotoChange }: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File | undefined) => {
      setError(null);
      if (!file) return;

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Envie uma foto em JPEG, PNG ou WebP.');
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError('Essa foto é grande demais — envie um arquivo de até 15MB.');
        return;
      }

      setIsProcessing(true);
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        onPhotoChange(dataUrl);
      } catch {
        setError('Não foi possível processar essa foto. Tente outra imagem.');
      } finally {
        setIsProcessing(false);
      }
    },
    [onPhotoChange],
  );

  if (photoDataUrl) {
    return (
      <div className="relative aspect-[4/5] w-full overflow-hidden border border-ink/10 bg-bone-200">
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL local (foto do cliente), não passa pelo otimizador de imagem do Next */}
        <img src={photoDataUrl} alt="Sua foto enviada" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={() => onPhotoChange(null)}
          aria-label="Remover foto"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center bg-ink text-white"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void processFile(event.dataTransfer.files[0]);
        }}
        className={`flex aspect-[4/5] w-full cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-6 text-center transition-colors ${
          isDragging ? 'border-ink bg-bone-200' : 'border-ink/20 hover:border-ink/40'
        }`}
      >
        <UploadIcon className="h-8 w-8 text-ink-muted" />
        <Text size="sm" weight="medium">
          {isProcessing ? 'Processando...' : 'Solte sua foto aqui'}
        </Text>
        <Text size="xs" tone="muted">
          ou clique para escolher — JPEG, PNG ou WebP
        </Text>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => void processFile(event.target.files?.[0])}
          disabled={isProcessing}
        />
      </label>
      {error && (
        <Text size="xs" className="mt-2 text-error" role="alert">
          {error}
        </Text>
      )}
    </div>
  );
}
