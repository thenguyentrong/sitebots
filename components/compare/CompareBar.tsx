'use client';

import Link from '@/components/LocaleLink';
import { comparisonHref, useCompare } from '@/lib/compare/store';
export { useCompare } from '@/lib/compare/store';
export type { CompareItem } from '@/lib/compare/store';
import { useLang, usePagePath } from '@/lib/i18n/client';
import { bilingual } from '@/lib/i18n/text';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

// On every page (the root layout renders the bar), so only these few words ship with it.
const TEXT = bilingual({
  en: { inComparison: 'In comparison', full: 'Comparison full', compare: 'Compare', bar: 'Compare', remove: 'Remove from comparison', open: (n: number) => `Open comparison (${n})`, clear: 'Clear' },
  de: { inComparison: 'Im Vergleich', full: 'Vergleich voll', compare: 'Vergleichen', bar: 'Vergleich', remove: 'Aus dem Vergleich entfernen', open: (n: number) => `Vergleich öffnen (${n})`, clear: 'Leeren' },
});

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function CompareToggle({ id, name, size = 'sm' }: { id: string; name: string; size?: 'sm' | 'md' }) {
  const t = TEXT[useLang()];
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
          {t.inComparison}
        </>
      ) : full ? (
        t.full
      ) : (
        <>
          <Icon d="M12 5v14M5 12h14" />
          {t.compare}
        </>
      )}
    </button>
  );
}

export function CompareBar() {
  const t = TEXT[useLang()];
  const { items, toggle, clear } = useCompare();
  // On the chat it would sit on top of the input, and the option cards link to the comparison anyway.
  // The path without the language, so /de (the German chat) counts too.
  const onChat = usePagePath() === '/';
  if (!items.length || onChat) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-edge bg-card p-2 pl-3 shadow-float">
        <span className="eyebrow mr-1">{t.bar}</span>
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => toggle(it)}
            title={t.remove}
            className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-subtle px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-edge-strong hover:bg-card"
          >
            {it.name}
            <span aria-hidden className="text-faint">
              ×
            </span>
          </button>
        ))}
        <Link href={comparisonHref(items)} className={cn(ui.btn, 'h-9 px-4')}>
          {t.open(items.length)}
        </Link>
        <button type="button" onClick={clear} className={cn(ui.btnGhost, 'h-9 px-3 text-xs')}>
          {t.clear}
        </button>
      </div>
    </div>
  );
}
