import type { Metadata } from 'next';
import { TryOnView } from '@/features/tryon/components/TryOnView/TryOnView';

export const metadata: Metadata = {
  title: 'Provador Digital',
  description:
    'Envie uma foto e veja como um tênis combina com seu estilo, com estimativa de caimento por IA.',
};

export default function ProvadorPage() {
  return <TryOnView />;
}
