import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import { formatDate, formatSpec } from '@/lib/spec/display';
import { fieldDef, visibleFields } from '@/lib/spec/fields';
import { ACTUATOR_GROUP_LABEL, SENSOR_TYPE_LABEL, summarizeJson, type ActuatorItem, type BatteryPack, type SensorItem } from '@/lib/spec/parts';
import type { Specs, SpecValue } from '@/lib/spec/types';

function hostOf(url: string): string {
  if (url.startsWith('curated://')) return 'curated';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function Provenance({ spec }: { spec: SpecValue }) {
  return (
    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-faint">
      <EvidenceBadge trust={spec.trust} />
      {spec.source_url.startsWith('curated://') ? <span>curated</span> : (
        <a href={spec.source_url} rel="nofollow noopener" target="_blank" className="underline-offset-2 hover:text-foreground hover:underline">
          {hostOf(spec.source_url)}
        </a>
      )}
      <span>· {formatDate(spec.observed_at)}</span>
    </span>
  );
}

const fmt = (n: number, d = 0) => n.toLocaleString('en-GB', { maximumFractionDigits: d });

/** Sensors, actuators and the battery pack as item lines; the scalar parts fields as rows above them. */
export function PartsPanel({ specs, formFactor }: { specs: Specs; formFactor: string }) {
  const present = new Set(Object.keys(specs));
  const scalar = visibleFields(formFactor, present).filter((f) => f.group === 'parts' && f.kind !== 'json');
  const sensors = specs.sensors?.value as unknown as SensorItem[] | undefined;
  const actuators = specs.actuators?.value as unknown as ActuatorItem[] | undefined;
  const battery = specs.battery_pack?.value as unknown as BatteryPack | undefined;
  const nothing = scalar.every((f) => !specs[f.id]) && !sensors && !actuators && !battery;

  return (
    <section className="card overflow-hidden" data-parts-panel>
      <header className="flex items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
        <h2 className="text-sm font-semibold">Built-in parts</h2>
        <span className="text-xs text-faint">{nothing ? 'nothing published' : 'what ships inside'}</span>
      </header>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {scalar.map((f) => {
            const spec = specs[f.id];
            return (
              <tr key={f.id} className="border-t border-edge/60 first:border-t-0 align-top">
                <td className="w-[36%] px-5 py-2.5 text-muted">{f.label}</td>
                <td className="num px-2 py-2.5 font-medium">{spec ? formatSpec(f.id, spec) : <span className="font-normal text-faint">not published</span>}</td>
                <td className="px-5 py-2.5 text-right">{spec ? <Provenance spec={spec} /> : <EvidenceBadge trust="unknown" />}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {[
        { key: 'sensors', label: 'Sensors', spec: specs.sensors, lines: sensors?.map((s) => `${s.count && s.count > 1 ? `${s.count}× ` : ''}${SENSOR_TYPE_LABEL[s.type] ?? s.type}${s.model ? ` · ${s.model}` : ''}${s.location ? ` · ${s.location}` : ''}${s.note ? ` — ${s.note}` : ''}`) },
        { key: 'actuators', label: 'Actuators', spec: specs.actuators, lines: actuators?.map((a) => `${ACTUATOR_GROUP_LABEL[a.group] ?? a.group}${a.count ? ` · ${a.count}×` : ''}${a.type ? ` ${a.type}` : ''}${a.model ? ` ${a.model}` : ''}${a.peak_torque_nm ? ` · ${fmt(a.peak_torque_nm)} N·m peak` : ''}${a.note ? ` — ${a.note}` : ''}`) },
        { key: 'battery_pack', label: 'Battery pack', spec: specs.battery_pack, lines: battery ? [summarizeJson('battery_pack', battery) + (battery.model ? ` · ${battery.model}` : '') + (battery.note ? ` — ${battery.note}` : '')] : undefined },
      ].map((block) =>
        block.spec && block.lines ? (
          <div key={block.key} className="border-t border-edge/70 px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted">{fieldDef(block.key)?.label ?? block.label}</p>
              <Provenance spec={block.spec} />
            </div>
            <ul className="mt-1.5 space-y-1 text-sm">
              {block.lines.map((l, i) => (
                <li key={i} className="num">{l}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </section>
  );
}
