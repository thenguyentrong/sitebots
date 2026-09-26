'use client';

import Link from 'next/link';
import { comparisonHref, useCompare } from '@/lib/compare/store';
export { useCompare } from '@/lib/compare/store';
export type { CompareItem } from '@/lib/compare/store';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function CompareToggle({ id, name, size = 'sm' }: { id: string; name: string; size?: 'sm' | 'md' }) {
  const { items, toggle, full } = useCompare();
  const on = items.some((x) => x.id === id);
  return (
    <button
      type="button"
      onClick={() => toggle({ id, name })}
      disabled={!on && full}
      aria-pressed={on}
      data-robot-id={id}
      className={cn(on ? ui.btn : ui.btnSecondary, size === 'sm' && ui.sm)}
    >
      {on ? (
        <>
          <Icon d="m5 12 5 5L20 7" />
          In comparison
        </>
      ) : full ? (
        'Comparison full'
      ) : (
        <>
          <Icon d="M12 5v14M5 12h14" />
          Compare
        </>
      )}
    </button>
  );
}

export function CompareBar() {
  const { items, toggle, clear } = useCompare();
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-edge bg-card/95 p-2 pl-3 shadow-float backdrop-blur">
        <span className="eyebrow mr-1">Compare</span>
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => toggle(it)}
            title="Remove from comparison"
            className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-subtle px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-edge-strong hover:bg-card"
          >
            {it.name}
            <span aria-hidden className="text-faint">
              ×
            </span>
          </button>
        ))}
        <Link href={comparisonHref(items)} className={cn(ui.btn, 'h-9 px-4')}>
          Open comparison ({items.length})
        </Link>
        <button type="button" onClick={clear} className={cn(ui.btnGhost, 'h-9 px-3 text-xs')}>
          Clear
        </button>
      </div>
    </div>
  );
}
