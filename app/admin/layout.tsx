import { Geist, Geist_Mono } from 'next/font/google';
import { SITE } from '@/lib/site';
import '../globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata = { metadataBase: new URL(SITE.url), title: { default: 'Admin', template: `%s | ${SITE.name}` } };

// Its own root layout: the public pages' root sits in app/[lang] and carries the language, and the admin
// pages are English only and private, without the public header and footer.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
