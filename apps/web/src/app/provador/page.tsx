import type { Metadata } from 'next';
import { TryOnView } from '@/features/tryon/components/TryOnView/TryOnView';
import { getTryOnConfig } from '@/services/tryon.service';

export const metadata: Metadata = {
  title: 'Provador Digital',
  description:
    'Descubra o tamanho certo pela medida do seu pé e veja como combinar cada tênis do catálogo.',
};

export default async function ProvadorPage() {
  const { usesPhoto } = await getTryOnConfig();
  return <TryOnView usesPhoto={usesPhoto} />;
}
