import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Banner, Brand, Category, Collection, ProductSummary, SocialPost } from '@asn/types';
import HomePage from './page';

vi.mock('@/services/catalog.service', () => ({
  getActiveBanners: vi.fn<() => Promise<Banner[]>>().mockResolvedValue([]),
  getFeaturedProducts: vi.fn<() => Promise<ProductSummary[]>>().mockResolvedValue([]),
  getLaunchedCollections: vi.fn<() => Promise<Collection[]>>().mockResolvedValue([]),
  getTopLevelCategories: vi.fn<() => Promise<Category[]>>().mockResolvedValue([]),
  getBrands: vi.fn<() => Promise<Brand[]>>().mockResolvedValue([]),
}));

vi.mock('@/services/marketing.service', () => ({
  getSocialPosts: vi.fn<() => Promise<SocialPost[]>>().mockResolvedValue([]),
}));

describe('HomePage', () => {
  it('renderiza sem quebrar quando todas as seções vêm vazias da API', async () => {
    const ui = await HomePage();
    render(ui);

    // A seção "Sobre a marca" é estática (não depende de dados da API) e
    // deve sempre renderizar — é o sinal de que a página montou.
    expect(screen.getByRole('heading', { name: /curadoria, não catálogo/i })).toBeInTheDocument();
  });
});
