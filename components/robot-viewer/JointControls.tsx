'use client';

import { useState } from 'react';
import { movableJoint, resolveJointValues, type JointValues } from '@/lib/models/joint-values';
import type { JointDef } from '@/lib/models/schemas';
import type { Lang } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { bilingual } from '@/lib/i18n/text';

const TEXT = bilingual({
  en: {
    title: 'Joint controls', adjustable: (n: number) => n + ' adjustable', joint: 'Joint', position: (name: string) => name + ' position', reset: 'Reset all joints',
    note: 'Explore joint movement within the model’s limits. Visual posing only; balance, collisions, and physical motion are not simulated.',
    noLimits: 'This joint has no complete source limits; the slider uses an inspection range.',
  },
  de: {
    title: 'Gelenksteuerung', adjustable: (n: number) => n + ' einstellbar', joint: 'Gelenk', position: (name: string) => 'Stellung von ' + name, reset: 'Alle Gelenke zurücksetzen',
    note: 'Probieren Sie die Gelenkbewegung innerhalb der Grenzen des Modells aus. Nur zur Ansicht: Gleichgewicht, Kollisionen und echte Bewegung werden nicht simuliert.',
    noLimits: 'Für dieses Gelenk sind die Grenzen nicht vollständig angegeben; der Regler nutzt einen Prüfbereich.',
  },
});

function label(name: string) { return name.replace(/_?joint$/i, '').replace(/_/g, ' '); }
/** Joint names are the model's own (URDF) and stay as they are. */
export function JointControls({ joints, values, onChange, onReset, disabled, lang = 'en' }: {
  joints: JointDef[]; values: JointValues; onChange: (name: string, value: number) => void; onReset: () => void; disabled: boolean; lang?: Lang;
}) {
  const t = TEXT[lang];
  const editable = joints.filter((j) => movableJoint(j) && !j.mimic && (j.lower === null || j.upper === null || j.lower < j.upper));
  const [selected, setSelected] = useState(editable[0]?.name ?? '');
  const joint = editable.find((j) => j.name === selected) ?? editable[0];
  if (!joint) return null;
  const slide = joint.type === 'prismatic';
  const factor = slide ? 1000 : 180 / Math.PI;
  const min = (joint.lower ?? (slide ? -0.5 : -Math.PI)) * factor;
  const max = (joint.upper ?? (slide ? 0.5 : Math.PI)) * factor;
  const value = (resolveJointValues(joints, values)[joint.name] ?? 0) * factor;
  const unit = slide ? 'mm' : '°';
  return <details className="border-t border-edge/70 px-3 py-3 text-sm" data-joint-controls>
    <summary className="cursor-pointer font-medium">{t.title} <span className="text-xs font-normal text-muted">· {t.adjustable(editable.length)}</span></summary>
    <div className="mt-3 space-y-3">
      <label className="block text-xs text-muted">{t.joint}
        <select aria-label={t.joint} value={joint.name} onChange={(event) => setSelected(event.target.value)} className="mt-1 block w-full rounded-lg border border-edge bg-card px-2 py-2 text-sm text-foreground">
          {editable.map((j) => <option key={j.name} value={j.name}>{label(j.name)}</option>)}
        </select>
      </label>
      <div className="flex justify-between gap-2 text-xs"><label htmlFor={`joint-${joint.name}`}>{label(joint.name)}</label><output className="num">{formatNumber(value, lang, slide ? 1 : 0, slide ? 1 : 0)}{unit}</output></div>
      <input id={`joint-${joint.name}`} type="range" aria-label={t.position(label(joint.name))} min={min} max={max} step={slide ? 0.1 : 0.5} value={value} disabled={disabled}
        onChange={(event) => onChange(joint.name, Number(event.target.value) / factor)} className="block h-6 w-full accent-[var(--foreground)]" />
      <div className="flex justify-between text-xs text-faint"><span>{formatNumber(min, lang)}{unit}</span><span>{formatNumber(max, lang)}{unit}</span></div>
      <button type="button" onClick={onReset} disabled={disabled} className="rounded-lg border border-edge px-3 py-1.5 text-xs hover:bg-subtle">{t.reset}</button>
      <p className="text-xs leading-relaxed text-muted">{t.note}</p>
      {joint.lower === null || joint.upper === null ? <p className="text-xs text-faint">{t.noLimits}</p> : null}
    </div>
  </details>;
}
