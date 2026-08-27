import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Heading } from '@asn/ui';
import { getAdminProduct } from '@/services/adminProducts.service';
import {
  getBrands,
  getLaunchedCollections,
  getTopLevelCategories,
} from '@/services/catalog.service';
import { ApiError } from '@/services/apiClient';
import { ProductForm } from '@/features/admin/components/ProductForm/ProductForm';

export const metadata: Metadata = {
  title: 'Editar produto — Administração',
  robots: { index: false, follow: false },
};

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let product;
  try {
    product = await getAdminProduct(id);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) notFound();
    throw error;
  }

  const [brands, categories, collections] = await Promise.all([
    getBrands(48),
    getTopLevelCategories(),
    getLaunchedCollections(12),
  ]);

  return (
    <div>
      <Heading as="h1" size="lg" className="mb-6">
        Editar produto
      </Heading>
      <ProductForm
        product={product}
        brands={brands}
        categories={categories}
        collections={collections}
      />
    </div>
  );
}
