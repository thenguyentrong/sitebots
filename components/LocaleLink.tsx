'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { localePath } from '@/lib/i18n/config';
import { useLang } from '@/lib/i18n/client';

/**
 * next/link that keeps the visitor in their language: on a German page '/robots' becomes '/de/robots'.
 * Pages write their links as the English path and this adds the prefix, so no link can forget it.
 * API routes, files and other sites pass through unchanged.
 */
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const lang = useLang();
  return <NextLink href={typeof href === 'string' ? localePath(href, lang) : href} {...props} />;
}
