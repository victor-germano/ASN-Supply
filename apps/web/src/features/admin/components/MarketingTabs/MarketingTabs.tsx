'use client';

import { useState } from 'react';
import type { AdminBanner, AdminSocialPost } from '@asn/types';
import { BannerManager } from '../BannerManager/BannerManager';
import { SocialPostManager } from '../SocialPostManager/SocialPostManager';

type Tab = 'banners' | 'posts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'banners', label: 'Banners' },
  { id: 'posts', label: 'Posts sociais' },
];

interface MarketingTabsProps {
  banners: AdminBanner[];
  posts: AdminSocialPost[];
}

/** Mesmo padrão de `CatalogTabs`: um client component só pras duas entidades de divulgação, cada `Manager` já lida com o próprio CRUD/estado local. */
export function MarketingTabs({ banners, posts }: MarketingTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('banners');

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

      {activeTab === 'banners' && <BannerManager initialBanners={banners} />}
      {activeTab === 'posts' && <SocialPostManager initialPosts={posts} />}
    </div>
  );
}
