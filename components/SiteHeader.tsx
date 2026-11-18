'use client';

import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/TopBar';

/** The chat draws the same bar itself, over the job site or above the conversation, so this one is for
 *  the pages it links to. */
export function SiteHeader() {
  if (usePathname() === '/') return null;
  return <TopBar />;
}
