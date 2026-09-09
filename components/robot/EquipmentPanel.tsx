import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/spec/display';
import { EQUIPMENT_TYPE_LABEL, type EquipmentItem, type EquipmentType } from '@/lib/spec/parts';
import type { SpecValue } from '@/lib/spec/types';

function hostOf(url: string): string {
  if (url.startsWith('curated://')) return 'curated';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * What the maker or a partner sells to bolt on: arms, hands, sensors, docks,
 * radios. One provenance line for the whole list; items that came from a
 * second source carry their own link.
 */
export function EquipmentPanel({ spec }: { spec: SpecValue | undefined }) {
  const items = Array.isArray(spec?.value) ? (spec.value as unknown as (EquipmentItem & { source_url?: string })[]) : [];
  const groups = new Map<EquipmentType, (EquipmentItem & { source_url?: string })[]>();
  for (const it of items) {
    if (!groups.has(it.type)) groups.set(it.type, []);
    groups.get(it.type)!.push(it);
  }
  return (
    <section className="card overflow-hidden" data-equipment-panel>
      <header className="flex items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
        <h2 className="text-sm font-semibold">Equipment options{items.length ? <span className="num text-faint"> · {items.length}</span> : null}</h2>
        {spec ? (
          <span className="flex items-center gap-2 text-xs text-faint">
            <EvidenceBadge trust={spec.trust} />
            {spec.source_url.startsWith('curated://') ? 'curated' : (
              <a href={spec.source_url} rel="nofollow noopener" target="_blank" className="underline-offset-2 hover:text-foreground hover:underline">
                {hostOf(spec.source_url)}
              </a>
            )}
            <span>· {formatDate(spec.observed_at)}</span>
          </span>
        ) : null}
      </header>
      {items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">No equipment options published — payloads and accessories are listed only where the maker or a partner sells them.</p>
      ) : (
        <div className="space-y-3 px-5 py-4">
          {[...groups].map(([type, list]) => (
            <div key={type}>
              <p className="label mb-1.5">{EQUIPMENT_TYPE_LABEL[type] ?? type}</p>
              <div className="flex flex-wrap gap-1.5">
                {list.map((it, i) => {
                  const inner = (
                    <>
                      {it.name}
                      {it.maker ? <span className="text-faint"> · {it.maker}</span> : null}
                      {it.included ? <span className="text-trust-verified"> · included</span> : null}
                    </>
                  );
                  return it.url ? (
                    <a key={i} href={it.url} rel="nofollow noopener" target="_blank" title={it.note} className="inline-flex">
                      <Badge variant="outline" className="transition hover:border-edge-strong hover:text-foreground">{inner}</Badge>
                    </a>
                  ) : (
                    <Badge key={i} variant="outline" title={it.note}>{inner}</Badge>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
