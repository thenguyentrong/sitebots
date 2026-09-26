'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlan } from '@/lib/plan/store';
import { ui } from '@/lib/ui';

/** The visitor's shortlist from every page. The count appears once the browser has read it. */
export function ShortlistLink() {
  const plan = usePlan();
  const pathname = usePathname() ?? '';
  const n = plan.workspace?.projects.length ?? 0;
  return <Link href="/plan" className={`${ui.btnSecondary} h-9 px-4`} aria-current={pathname.startsWith('/plan') ? 'page' : undefined}>
    My shortlist
    {n ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-xs font-semibold text-background" aria-label={`${n} tasks`}>{n}</span> : null}
  </Link>;
}
