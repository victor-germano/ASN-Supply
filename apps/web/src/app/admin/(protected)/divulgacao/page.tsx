import type { Metadata } from 'next';
import { Heading, Text } from '@asn/ui';
import { getAdminBanners, getAdminSocialPosts } from '@/services/adminMarketing.service';
import { MarketingTabs } from '@/features/admin/components/MarketingTabs/MarketingTabs';

export const metadata: Metadata = {
  title: 'Divulgação — Administração',
  robots: { index: false, follow: false },
};

export default async function AdminDivulgacaoPage() {
  const [banners, posts] = await Promise.all([getAdminBanners(), getAdminSocialPosts()]);

  return (
    <div>
      <Heading as="h1" size="lg" className="mb-2">
        Divulgação
      </Heading>
      <Text tone="muted" className="mb-6">
        Fotos de divulgação exibidas na Home — banners do topo e vitrine de posts.
      </Text>
      <MarketingTabs banners={banners} posts={posts} />
    </div>
  );
}
