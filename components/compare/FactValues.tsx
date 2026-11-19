import { notPublished, type FactValue } from '@/lib/compare/facts';
import type { Lang } from '@/lib/i18n/config';
import { requestLang } from '@/lib/i18n/server';

/** One fact as the compare table and Key facts show it: the value, its conditions, who states it.
 * One component for both, so a value cannot read differently on the two pages. A server component:
 * without a `lang` prop it reads the page's language from the request. */
export function FactValues({ values, lang = requestLang() }: { values: FactValue[]; lang?: Lang }) {
  if (!values.length) return <span className="text-faint">{notPublished(lang)}</span>;
  return <div className="space-y-2">{values.map((value, index) => <div key={index} className="min-w-0">
    <p className={value.muted ? 'text-faint' : 'num font-medium break-words text-foreground'}>{value.text}</p>
    {value.note ? <p className="mt-0.5 text-xs leading-snug text-muted">{value.note}</p> : null}
    {value.source ? <a href={value.source.url} target="_blank" rel="nofollow noopener noreferrer" className="mt-0.5 block break-words text-[11px] leading-snug text-faint underline-offset-2 hover:text-foreground hover:underline">{value.source.label} ↗</a> : null}
  </div>)}</div>;
}
