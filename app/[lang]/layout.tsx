import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { AccessDialog } from '@/components/account/AccessDialog';
import { CompareBar } from '@/components/compare/CompareBar';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { COMMON } from '@/lib/i18n/common';
import { LangProvider } from '@/lib/i18n/client';
import { LANGS, OG_LOCALE, isLang } from '@/lib/i18n/config';
import { setRequestLang } from '@/lib/i18n/server';
import { SITE } from '@/lib/site';
import '../globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

// The root layout of every public page. /robots is /en/robots inside (proxy.ts) and /de/robots is German,
// so the language is a route segment: static pages are built once per language and <html lang> is right
// from the first byte. The admin pages have their own root layout and stay English.
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : 'en';
  const t = COMMON[lang];
  return {
    // Without this, Open Graph and canonical URLs resolve against whatever host
    // rendered the page — a preview deployment URL, or localhost.
    metadataBase: new URL(SITE.url),
    applicationName: SITE.name,
    title: {
      default: `${t.tagline} | ${SITE.name}`,
      template: `%s | ${SITE.name}`,
    },
    description: t.description,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
      title: `${t.tagline} | ${SITE.name}`,
      description: t.description,
      url: lang === 'de' ? '/de' : '/',
      siteName: SITE.name,
      type: 'website',
      locale: OG_LOCALE[lang],
    },
  };
}

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  setRequestLang(lang);
  return (
    <html lang={lang} data-theme="dark" data-scroll-behavior="smooth" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <LangProvider lang={lang}>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
          <CompareBar />
          <AccessDialog />
        </LangProvider>
      </body>
    </html>
  );
}
