import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** One section of a robot page: same card, same heading bar. With nothing to show it stays in place
 * and says so in one line, so every robot page has the same sections in the same order. */
export function RobotSection({ id, title, aside, empty, className, children }: { id: string; title: string; aside?: ReactNode; empty?: string; className?: string; children?: ReactNode }) {
  return <section id={id} className={cn('card scroll-mt-6 overflow-hidden', className)} aria-labelledby={id + '-title'}>
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-edge/70 px-5 py-3.5">
      <h2 id={id + '-title'} className="text-sm font-semibold">{title}</h2>
      {aside}
    </header>
    {children ?? <p className="px-5 py-4 text-sm text-muted">{empty}</p>}
  </section>;
}
