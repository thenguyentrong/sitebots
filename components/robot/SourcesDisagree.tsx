import { qualifierLabel } from '@/lib/spec/display';
import { fieldDef } from '@/lib/spec/fields';
import type { SpecConflict } from '@/lib/spec/types';

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

/** Values two sources state differently. Shown open: a buyer should see the doubt without asking for it. */
export function SourcesDisagree({ conflicts }: { conflicts: SpecConflict[] }) {
  if (!conflicts.length) return null;
  return <section id="conflicts" className="card scroll-mt-6 border-safety/30 bg-safety-soft/30 p-5" aria-labelledby="conflicts-title">
    <h2 id="conflicts-title" className="text-sm font-semibold">Sources disagree</h2>
    <ul className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
      {conflicts.map((c) => (
        <li key={c.key} className="rounded-xl border border-safety/20 bg-card/80 p-3">
          <span className="font-medium">{fieldDef(c.key.split(':')[0])?.label ?? c.key}</span>
          {c.key.includes(':') ? <span className="text-faint"> · {qualifierLabel(c.key.split(':')[1])}</span> : null}
          <ul className="num mt-1.5 space-y-0.5 text-muted">
            {c.values.map((v, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span>{String(v.value)}</span>
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
