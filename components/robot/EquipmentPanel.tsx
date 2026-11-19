import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import { Badge } from '@/components/ui/badge';
import type { Lang } from '@/lib/i18n/config';
import { PANEL_TEXT } from '@/lib/i18n/robot';
import { formatDate } from '@/lib/spec/display';
import { fieldLabel } from '@/lib/spec/fields';
import { equipmentTypeLabel, type EquipmentItem, type EquipmentType } from '@/lib/spec/parts';
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
export function EquipmentPanel({ spec, lang = 'en' }: { spec: SpecValue | undefined; lang?: Lang }) {
  const t = PANEL_TEXT[lang];
  const items = Array.isArray(spec?.value) ? (spec.value as unknown as (EquipmentItem & { source_url?: string })[]) : [];
  const groups = new Map<EquipmentType, (EquipmentItem & { source_url?: string })[]>();
  for (const it of items) {
    if (!groups.has(it.type)) groups.set(it.type, []);
    groups.get(it.type)!.push(it);
  }
  return (
    <section className="card overflow-hidden" data-equipment-panel>
      <header className="flex items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
        <h2 className="text-sm font-semibold">{fieldLabel('equipment_options', lang)}{items.length ? <span className="num text-faint"> · {items.length}</span> : null}</h2>
        {spec ? (
          <span className="flex items-center gap-2 text-xs text-faint">
            <EvidenceBadge trust={spec.trust} lang={lang} />
            {spec.source_url.startsWith('curated://') ? t.curated : (
              <a href={spec.source_url} rel="nofollow noopener" target="_blank" className="underline-offset-2 hover:text-foreground hover:underline">
                {hostOf(spec.source_url)}
              </a>
            )}
            <span>· {formatDate(spec.observed_at, lang)}</span>
          </span>
        ) : null}
      </header>
      {items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">{t.noEquipment}</p>
      ) : (
        <div className="space-y-3 px-5 py-4">
          {[...groups].map(([type, list]) => (
            <div key={type}>
              <p className="label mb-1.5">{equipmentTypeLabel(type, lang)}</p>
              <div className="flex flex-wrap gap-1.5">
                {list.map((it, i) => {
                  const inner = (
                    <>
                      {it.name}
                      {it.maker ? <span className="text-faint"> · {it.maker}</span> : null}
                      {it.included ? <span className="text-trust-verified"> · {t.included}</span> : null}
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
