import { NOT_PUBLISHED, type FactValue } from '@/lib/compare/facts';

/** One fact as the compare table and Key facts show it: the value, its conditions, who states it.
 * One component for both, so a value cannot read differently on the two pages. */
export function FactValues({ values }: { values: FactValue[] }) {
  if (!values.length) return <span className="text-faint">{NOT_PUBLISHED}</span>;
  return <div className="space-y-2">{values.map((value, index) => <div key={index} className="min-w-0">
    <p className={value.muted ? 'text-faint' : 'num font-medium break-words text-foreground'}>{value.text}</p>
    {value.note ? <p className="mt-0.5 text-xs leading-snug text-muted">{value.note}</p> : null}
    {value.source ? <a href={value.source.url} target="_blank" rel="nofollow noopener noreferrer" className="mt-0.5 block break-words text-[11px] leading-snug text-faint underline-offset-2 hover:text-foreground hover:underline">{value.source.label} ↗</a> : null}
  </div>)}</div>;
}
