import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

export const HOME_DESCRIPTION =
  'Explore humanoids, robot dogs and mobile platforms in map and list views. Compare sourced specifications, task evidence and supplier contacts.';

type PublicMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}` | '/';
  absoluteTitle?: boolean;
  image?: string;
};

export function publicMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  image = '/og.png',
}: PublicMetadataOptions): Metadata {
  const socialTitle = `${title} | ${SITE.name}`;
  return {
    title: absoluteTitle ? { absolute: socialTitle } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: SITE.name,
      locale: 'en_GB',
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
