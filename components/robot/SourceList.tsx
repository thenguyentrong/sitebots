import { RobotSection } from '@/components/robot/RobotSection';
import { recordLang, type Lang } from '@/lib/i18n/config';
import { PANEL_TEXT, recordDay } from '@/lib/i18n/robot';
import type { MarketSource } from '@/lib/market/display';
import { formatDate } from '@/lib/spec/display';
import type { RobotSource } from '@/lib/spec/types';

/**
 * Every URL a value on this page was read from, with the attribution text the
 * source asked for. The aggregators sell their catalogues; naming them is the
 * deal. Market records cite their own pages, listed in the same section.
 * Page titles and attribution texts are the sources' own words.
 */
export function SourceList({ sources: raw = [], market = [], lang = 'en' }: { sources?: RobotSource[]; market?: MarketSource[]; lang?: Lang }) {
  const t = PANEL_TEXT[lang];
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
  const marketPages = [...new Map(market.filter((source) => !byUrl.has(source.url)).map((source) => [source.url, source])).values()];
  const count = sources.length + marketPages.length;
  return (
    <RobotSection id="sources" title={t.sources} empty={t.noSources} aside={count ? <span className="text-xs text-faint">{t.pages(count)}</span> : null}>
      {count ? <>
        <ul className="divide-y divide-edge/60 text-sm">
          {marketPages.map((source) => (
            <li key={source.url} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-2.5">
              <a href={source.url} rel="nofollow noopener" target="_blank" className="min-w-0 break-words underline-offset-2 transition hover:underline" lang={recordLang(lang)}>{source.title} ↗</a>
              <span className="shrink-0 text-xs text-faint">{source.publisher} · {t.marketKind(source.kind)} · {t.checked} {recordDay(source.checkedAt, lang)}</span>
            </li>
          ))}
          {sources.map((s) => (
            <li key={s.source_url} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-2.5">
              {s.source_url.startsWith('curated://') ? (
                <span className="min-w-0 break-all text-muted">
                  {s.source_url.replace('curated://', 'data/curated/').replace(/#.*$/, '')} <span className="text-faint">{t.assessedBySitebots}</span>
                </span>
              ) : (
                <a href={s.source_url} rel="nofollow noopener" target="_blank" className="min-w-0 break-all underline-offset-2 transition hover:underline">
                  {s.source_url}
                </a>
              )}
              <span className="shrink-0 text-xs text-faint">
                {s.kind ? t.kind[s.kind] ?? s.kind : t.unregistered} · {t.values(s.facts)} · {t.seen} {formatDate(s.observed_at, lang)}
              </span>
            </li>
          ))}
        </ul>
        {attributions.length ? (
          <ul className="space-y-1 border-t border-edge/70 bg-subtle/40 px-5 py-3 text-xs text-faint" lang={recordLang(lang)}>
            {attributions.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        ) : null}
      </> : undefined}
    </RobotSection>
  );
}
