import { formatDate } from '@/lib/spec/display';
import type { RobotSource } from '@/lib/spec/types';

const KIND_LABEL: Record<string, string> = {
  curated: 'curated',
  manufacturer: 'manufacturer',
  distributor: 'distributor',
  aggregator: 'database',
  index: 'index',
};

/**
 * Every URL a value on this page was read from, with the attribution text the
 * source asked for. The aggregators sell their catalogues; naming them is the
 * deal.
 */
export function SourceList({ sources: raw }: { sources: RobotSource[] }) {
  if (!raw.length) return null;
  // The same URL can back facts under two source ids (a manufacturer page read
  // directly, and the curated entry that cites it as evidence). One line per URL.
  const byUrl = new Map<string, RobotSource>();
  for (const s of raw) {
    const key = s.source_url.startsWith('curated://') ? s.source_url.replace(/#.*$/, '') : s.source_url;
    const prev = byUrl.get(key);
    if (!prev) byUrl.set(key, { ...s, source_url: key });
    else {
      prev.facts += s.facts;
      if (prev.observed_at < s.observed_at) prev.observed_at = s.observed_at;
      if ((prev.tier ?? 9) > (s.tier ?? 9)) Object.assign(prev, { name: s.name, kind: s.kind, tier: s.tier, attribution_text: s.attribution_text ?? prev.attribution_text });
    }
  }
  const sources = [...byUrl.values()];
  const attributions = [...new Set(sources.map((s) => s.attribution_text).filter(Boolean))] as string[];
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
        <h2 className="text-sm font-semibold">Sources</h2>
        <span className="text-xs text-faint">
          {sources.length} page{sources.length === 1 ? '' : 's'}
        </span>
      </header>
      <ul className="divide-y divide-edge/60 text-sm">
        {sources.map((s) => (
          <li key={s.source_url} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-2.5">
            {s.source_url.startsWith('curated://') ? (
              <span className="min-w-0 break-all text-muted">
                {s.source_url.replace('curated://', 'data/curated/').replace(/#.*$/, '')} <span className="text-faint">(assessed by sitebots)</span>
              </span>
            ) : (
              <a href={s.source_url} rel="nofollow noopener" target="_blank" className="min-w-0 break-all underline-offset-2 transition hover:underline">
                {s.source_url}
              </a>
            )}
            <span className="shrink-0 text-xs text-faint">
              {s.kind ? KIND_LABEL[s.kind] ?? s.kind : 'unregistered'} · {s.facts} value{s.facts === 1 ? '' : 's'} · seen {formatDate(s.observed_at)}
            </span>
          </li>
        ))}
      </ul>
      {attributions.length ? (
        <ul className="space-y-1 border-t border-edge/70 bg-subtle/40 px-5 py-3 text-xs text-faint">
          {attributions.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
