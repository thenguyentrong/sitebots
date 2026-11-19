import type { Lang } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { PANEL_TEXT } from '@/lib/i18n/robot';
import { qualifierLabel } from '@/lib/spec/display';
import { fieldLabel } from '@/lib/spec/fields';
import type { SpecConflict } from '@/lib/spec/types';

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

/** Values two sources state differently. Shown open: a buyer should see the doubt without asking for it. */
export function SourcesDisagree({ conflicts, lang = 'en' }: { conflicts: SpecConflict[]; lang?: Lang }) {
  if (!conflicts.length) return null;
  const shown = (value: unknown) => (typeof value === 'number' && lang !== 'en' ? formatNumber(value, lang, 3) : String(value));
  return <section id="conflicts" className="card scroll-mt-6 border-safety/30 bg-safety-soft/30 p-5" aria-labelledby="conflicts-title">
    <h2 id="conflicts-title" className="text-sm font-semibold">{PANEL_TEXT[lang].disagree}</h2>
    <ul className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
      {conflicts.map((c) => (
        <li key={c.key} className="rounded-xl border border-safety/20 bg-card/80 p-3">
          <span className="font-medium">{fieldLabel(c.key.split(':')[0], lang)}</span>
          {c.key.includes(':') ? <span className="text-faint"> · {qualifierLabel(c.key.split(':')[1], lang)}</span> : null}
          <ul className="num mt-1.5 space-y-0.5 text-muted">
            {c.values.map((v, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span>{shown(v.value)}</span>
                <a href={v.source_url} rel="nofollow noopener" target="_blank" className="text-xs text-faint underline-offset-2 hover:text-foreground hover:underline">
                  {hostOf(v.source_url)}
                </a>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  </section>;
}
