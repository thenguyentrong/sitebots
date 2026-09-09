import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { CompareBar } from '@/components/compare/CompareBar';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { HOME_DESCRIPTION } from '@/lib/seo';
import { SITE } from '@/lib/site';
import './globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  // Without this, Open Graph and canonical URLs resolve against whatever host
  // rendered the page — a preview deployment URL, or localhost.
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  title: {
    default: `${SITE.tagline} | ${SITE.name}`,
    template: `%s | ${SITE.name}`,
  },
  description: HOME_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    title: `${SITE.tagline} | ${SITE.name}`,
    description: HOME_DESCRIPTION,
    url: '/',
    siteName: SITE.name,
    type: 'website',
    locale: 'en_GB',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
        <CompareBar />
      </body>
    </html>
  );
}
