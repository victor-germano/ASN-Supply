import type { Metadata } from 'next';
import { Heading, Text } from '@asn/ui';
import {
  getAdminBrands,
  getAdminCategories,
  getAdminCollections,
} from '@/services/adminCatalog.service';
import { CatalogTabs } from '@/features/admin/components/CatalogTabs/CatalogTabs';

export const metadata: Metadata = {
  title: 'Catálogo — Administração',
  robots: { index: false, follow: false },
};

export default async function AdminCatalogoPage() {
  const [brands, categories, collections] = await Promise.all([
    getAdminBrands(),
    getAdminCategories(),
    getAdminCollections(),
  ]);

  return (
    <div>
      <Heading as="h1" size="lg" className="mb-2">
        Catálogo
      </Heading>
      <Text tone="muted" className="mb-6">
        Marcas, categorias e coleções — usadas nos dropdowns do formulário de produto e na Home.
      </Text>
      <CatalogTabs brands={brands} categories={categories} collections={collections} />
    </div>
  );
}
