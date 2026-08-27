'use client';

import { useState } from 'react';
import type { AdminCategory, AdminCollection, Brand } from '@asn/types';
import { BrandManager } from '../BrandManager/BrandManager';
import { CategoryManager } from '../CategoryManager/CategoryManager';
import { CollectionManager } from '../CollectionManager/CollectionManager';

type Tab = 'marcas' | 'categorias' | 'colecoes';

const TABS: { id: Tab; label: string }[] = [
  { id: 'marcas', label: 'Marcas' },
  { id: 'categorias', label: 'Categorias' },
  { id: 'colecoes', label: 'Coleções' },
];

interface CatalogTabsProps {
  brands: Brand[];
  categories: AdminCategory[];
  collections: AdminCollection[];
}

/**
 * Um só client component pras três entidades de apoio do catálogo — cada
 * `Manager` já lida com o próprio CRUD/estado local, isto aqui só decide
 * qual mostrar. `admin/produtos` continua com páginas dedicadas (formulário
 * bem maior, com imagens/variantes); marca/categoria/coleção não precisam
 * do mesmo tanto de estrutura.
 */
export function CatalogTabs({ brands, categories, collections }: CatalogTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('marcas');

  return (
    <div>
      <div className="mb-6 flex gap-6 border-b border-ink/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 pb-3 text-sm uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'marcas' && <BrandManager initialBrands={brands} />}
      {activeTab === 'categorias' && <CategoryManager initialCategories={categories} />}
      {activeTab === 'colecoes' && <CollectionManager initialCollections={collections} />}
    </div>
  );
}
