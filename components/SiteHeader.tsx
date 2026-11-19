'use client';

import { TopBar } from '@/components/TopBar';
import { usePagePath } from '@/lib/i18n/client';

/** The chat draws the same bar itself, over the job site or above the conversation, so this one is for
 *  the pages it links to. The chat's own bar carries the language switch too. */
export function SiteHeader() {
  if (usePagePath().startsWith('/advisor')) return null;
  return <TopBar />;
}
