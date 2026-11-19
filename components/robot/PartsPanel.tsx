import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import type { Lang } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { PANEL_TEXT } from '@/lib/i18n/robot';
import { formatDate, formatSpec } from '@/lib/spec/display';
import { fieldLabel, visibleFields } from '@/lib/spec/fields';
import { actuatorGroupLabel, sensorTypeLabel, summarizeJson, type ActuatorItem, type BatteryPack, type SensorItem } from '@/lib/spec/parts';
import type { Specs, SpecValue } from '@/lib/spec/types';

function hostOf(url: string): string {
  if (url.startsWith('curated://')) return 'curated';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function Provenance({ spec, lang }: { spec: SpecValue; lang: Lang }) {
  return (
    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-faint">
      <EvidenceBadge trust={spec.trust} lang={lang} />
      {spec.source_url.startsWith('curated://') ? <span>{PANEL_TEXT[lang].curated}</span> : (
        <a href={spec.source_url} rel="nofollow noopener" target="_blank" className="underline-offset-2 hover:text-foreground hover:underline">
          {hostOf(spec.source_url)}
        </a>
      )}
      <span>· {formatDate(spec.observed_at, lang)}</span>
    </span>
  );
}

/** Sensors, actuators and the battery pack as item lines; the scalar parts fields as lines above them,
 * each value under its label so long text has the full width. What nobody publishes is named in one line.
 * Models, locations and notes in the lines are the sources' words. */
export function PartsPanel({ specs, formFactor, alsoUnpublished = [], lang = 'en' }: { specs: Specs; formFactor: string; alsoUnpublished?: string[]; lang?: Lang }) {
  const t = PANEL_TEXT[lang];
  const present = new Set(Object.keys(specs));
  const scalar = visibleFields(formFactor, present).filter((f) => f.group === 'parts' && f.kind !== 'json');
  const unpublished = [...scalar.filter((f) => !specs[f.id]).map((f) => fieldLabel(f.id, lang)), ...alsoUnpublished];
  const sensors = specs.sensors?.value as unknown as SensorItem[] | undefined;
  const actuators = specs.actuators?.value as unknown as ActuatorItem[] | undefined;
  const battery = specs.battery_pack?.value as unknown as BatteryPack | undefined;
  const nothing = scalar.every((f) => !specs[f.id]) && !sensors && !actuators && !battery;

  return (
    <section className="card overflow-hidden" data-parts-panel>
      <header className="flex items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
        <h2 className="text-sm font-semibold">{t.parts}</h2>
        <span className="text-xs text-faint">{nothing ? t.nothing : t.inside}</span>
      </header>
      <ul className="divide-y divide-edge/60">
        {scalar.filter((f) => specs[f.id]).map((f) => {
          const spec = specs[f.id]!;
          return (
            <li key={f.id} className="px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-xs font-medium text-muted">{fieldLabel(f.id, lang)}</p>
                <Provenance spec={spec} lang={lang} />
              </div>
              <p className="num mt-1 text-sm font-medium">{formatSpec(f.id, spec, lang)}</p>
            </li>
          );
        })}
      </ul>
      {[
        { key: 'sensors', spec: specs.sensors, lines: sensors?.map((s) => `${s.count && s.count > 1 ? `${s.count}× ` : ''}${sensorTypeLabel(s.type, lang)}${s.model ? ` · ${s.model}` : ''}${s.location ? ` · ${s.location}` : ''}${s.note ? `: ${s.note}` : ''}`) },
        { key: 'actuators', spec: specs.actuators, lines: actuators?.map((a) => `${actuatorGroupLabel(a.group, lang)}${a.count ? ` · ${a.count}×` : ''}${a.type ? ` ${a.type}` : ''}${a.model ? ` ${a.model}` : ''}${a.peak_torque_nm ? ` · ${formatNumber(a.peak_torque_nm, lang)} N·m ${t.peak}` : ''}${a.note ? `: ${a.note}` : ''}`) },
        { key: 'battery_pack', spec: specs.battery_pack, lines: battery ? [summarizeJson('battery_pack', battery, lang) + (battery.model ? ` · ${battery.model}` : '') + (battery.note ? `: ${battery.note}` : '')] : undefined },
      ].map((block) =>
        block.spec && block.lines ? (
          <div key={block.key} className="border-t border-edge/70 px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted">{fieldLabel(block.key, lang)}</p>
              <Provenance spec={block.spec} lang={lang} />
            </div>
            <ul className="mt-1.5 space-y-1 text-sm">
              {block.lines.map((l, i) => (
                <li key={i} className="num">{l}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
      {unpublished.length ? <p className="border-t border-edge/70 px-5 py-3 text-xs text-muted">{t.notPublishedList}{unpublished.join(', ')}.</p> : null}
    </section>
  );
}
