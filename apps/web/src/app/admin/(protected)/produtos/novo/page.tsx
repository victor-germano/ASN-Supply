import type { Metadata } from 'next';
import { Heading } from '@asn/ui';
import {
  getBrands,
  getLaunchedCollections,
  getTopLevelCategories,
} from '@/services/catalog.service';
import { ProductForm } from '@/features/admin/components/ProductForm/ProductForm';

export const metadata: Metadata = {
  title: 'Novo produto — Administração',
  robots: { index: false, follow: false },
};

export default async function NovoProdutoPage() {
  const [brands, categories, collections] = await Promise.all([
    getBrands(48),
    getTopLevelCategories(),
    getLaunchedCollections(12),
  ]);

  return (
    <div>
      <Heading as="h1" size="lg" className="mb-6">
        Novo produto
      </Heading>
      <ProductForm brands={brands} categories={categories} collections={collections} />
    </div>
  );
}
