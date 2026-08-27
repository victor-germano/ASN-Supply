import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { QueryProvider } from '@/providers/QueryProvider';
import { StoreHydration } from '@/providers/StoreHydration';
import { WishlistSync } from '@/features/wishlist/components/WishlistSync/WishlistSync';
import { CartSync } from '@/features/cart/components/CartSync/CartSync';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import './globals.css';

const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sansFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ASN Supply — Tênis premium, edições exclusivas',
    template: '%s | ASN Supply',
  },
  description:
    'ASN Supply é uma curadoria de tênis premium e edições exclusivas, com envio para todo o Brasil.',
  keywords: ['tênis premium', 'sneakers', 'edições limitadas', 'streetwear', 'ASN Supply'],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'ASN Supply',
    title: 'ASN Supply — Tênis premium, edições exclusivas',
    description: 'Curadoria de tênis premium e edições exclusivas, com envio para todo o Brasil.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ASN Supply — Tênis premium, edições exclusivas',
    description: 'Curadoria de tênis premium e edições exclusivas, com envio para todo o Brasil.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#16160F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${displayFont.variable} ${sansFont.variable}`}>
      <body>
        <QueryProvider>
          <StoreHydration />
          <WishlistSync />
          <CartSync />
          <Header />
          {children}
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}
