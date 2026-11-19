import type { Metadata } from 'next';
import { COMMON } from '@/lib/i18n/common';
import { OG_LOCALE, localePath, type Lang } from '@/lib/i18n/config';
import { SITE } from '@/lib/site';

export const HOME_DESCRIPTION = COMMON.en.description;

type PublicMetadataOptions = {
  title: string;
  description: string;
  /** The English path; the German one is derived from it. */
  path: `/${string}` | '/';
  lang: Lang;
  absoluteTitle?: boolean;
  image?: string;
};

/** Every language version of a page, for hreflang: English is also the default for anyone else. */
export function languageAlternates(path: string): Record<string, string> {
  return { en: localePath(path, 'en'), de: localePath(path, 'de'), 'x-default': localePath(path, 'en') };
}

export function publicMetadata({
  title,
  description,
  path,
  lang,
  absoluteTitle = false,
  image = '/og.png',
}: PublicMetadataOptions): Metadata {
  const socialTitle = `${title} | ${SITE.name}`;
  const url = localePath(path, lang);
  return {
    title: absoluteTitle ? { absolute: socialTitle } : title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: SITE.name,
      locale: OG_LOCALE[lang],
      alternateLocale: [OG_LOCALE[lang === 'de' ? 'en' : 'de']],
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [image],
    },
  };
}

export const PRIVATE_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};
