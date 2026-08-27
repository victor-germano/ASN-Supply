import type { Metadata } from 'next';
import { CompareView } from '@/features/compare/components/CompareView/CompareView';

export const metadata: Metadata = {
  title: 'Comparar produtos',
  robots: { index: false, follow: false },
};

export default function CompararPage() {
  return <CompareView />;
}
