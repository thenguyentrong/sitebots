import Link from 'next/link';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

// Shared by both views of the robots page, so switching between them keeps the same frame.

/** In Germany: what a buyer here can get. Worldwide: every robot we track, prototypes included. */
export function ScopeSwitch({ world, q }: { world: boolean; q?: string }) {
  const search = q ? 'q=' + encodeURIComponent(q) : '';
  return <nav className={cn(ui.segment, 'mb-4')} aria-label="Where the robots are sold">
    <Link href={'/robots' + (search ? '?' + search : '')} className={cn(ui.segmentItem, 'px-4 py-1.5', !world && ui.segmentActive)} aria-current={!world ? 'page' : undefined}>In Germany</Link>
    <Link href={'/robots?scope=world' + (search ? '&' + search : '')} className={cn(ui.segmentItem, 'px-4 py-1.5', world && ui.segmentActive)} aria-current={world ? 'page' : undefined}>Worldwide</Link>
  </nav>;
}

export function RobotSearch({ q, keep }: { q?: string; keep: Record<string, string | undefined> }) {
  return <form action="/robots" method="get" className="ml-auto flex w-full items-center gap-2 sm:w-auto">
    {Object.entries(keep).map(([name, value]) => value ? <input key={name} type="hidden" name={name} value={value} /> : null)}
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">Search robots</span>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input key={q ?? ''} type="search" name="q" defaultValue={q ?? ''} placeholder="Maker or model" className={`${ui.input} h-9 w-full pl-9 sm:w-52`} />
    </label>
    <button type="submit" className={`${ui.btn} h-9 shrink-0 px-4`}>Search</button>
  </form>;
}
