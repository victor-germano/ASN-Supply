import {
  getActiveBanners,
  getBrands,
  getFeaturedProducts,
  getLaunchedCollections,
  getTopLevelCategories,
} from '@/services/catalog.service';
import { getSocialPosts } from '@/services/marketing.service';
import { Hero } from '@/features/home/components/Hero/Hero';
import { ProductGrid } from '@/features/home/components/ProductGrid/ProductGrid';
import { Collections } from '@/features/home/components/Collections/Collections';
import { Categories } from '@/features/home/components/Categories/Categories';
import { Brands } from '@/features/home/components/Brands/Brands';
import { Benefits } from '@/features/home/components/Benefits/Benefits';
import { SocialShowcase } from '@/features/home/components/SocialShowcase/SocialShowcase';
import { Newsletter } from '@/features/home/components/Newsletter/Newsletter';
import { AboutBrand } from '@/features/home/components/AboutBrand/AboutBrand';

const ABOUT_IMAGE_URL = '/seed-art/art-05.svg';

export default async function HomePage() {
  const [banners, newArrivals, bestSellers, collections, categories, brands, socialPosts] =
    await Promise.all([
      getActiveBanners(),
      getFeaturedProducts('new-arrivals', 8),
      getFeaturedProducts('best-sellers', 8),
      getLaunchedCollections(3),
      getTopLevelCategories(),
      getBrands(12),
      getSocialPosts(6),
    ]);

  return (
    <main>
      <Hero banners={banners} />
      <ProductGrid
        id="lancamentos"
        title="Lançamentos"
        subtitle="As peças mais recentes da curadoria, direto da vitrine."
        products={newArrivals}
      />
      <ProductGrid
        id="mais-vendidos"
        title="Mais Vendidos"
        subtitle="O que a comunidade ASN Supply mais está usando."
        products={bestSellers}
      />
      <Collections collections={collections} />
      <Categories categories={categories} />
      <Brands brands={brands} />
      <Benefits />
      <SocialShowcase posts={socialPosts} />
      <Newsletter />
      <AboutBrand imageUrl={ABOUT_IMAGE_URL} />
    </main>
  );
}
