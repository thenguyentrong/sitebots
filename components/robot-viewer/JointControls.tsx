'use client';

import { useState } from 'react';
import { movableJoint, resolveJointValues, type JointValues } from '@/lib/models/joint-values';
import type { JointDef } from '@/lib/models/schemas';

function label(name: string) { return name.replace(/_?joint$/i, '').replace(/_/g, ' '); }
export function JointControls({ joints, values, onChange, onReset, disabled }: {
  joints: JointDef[]; values: JointValues; onChange: (name: string, value: number) => void; onReset: () => void; disabled: boolean;
}) {
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
    <summary className="cursor-pointer font-medium">Joint controls <span className="text-xs font-normal text-muted">· {editable.length} adjustable</span></summary>
    <div className="mt-3 space-y-3">
      <label className="block text-xs text-muted">Joint
        <select aria-label="Joint" value={joint.name} onChange={(event) => setSelected(event.target.value)} className="mt-1 block w-full rounded-lg border border-edge bg-card px-2 py-2 text-sm text-foreground">
          {editable.map((j) => <option key={j.name} value={j.name}>{label(j.name)}</option>)}
        </select>
      </label>
      <div className="flex justify-between gap-2 text-xs"><label htmlFor={`joint-${joint.name}`}>{label(joint.name)}</label><output className="num">{value.toFixed(slide ? 1 : 0)}{unit}</output></div>
      <input id={`joint-${joint.name}`} type="range" aria-label={`${label(joint.name)} position`} min={min} max={max} step={slide ? 0.1 : 0.5} value={value} disabled={disabled}
        onChange={(event) => onChange(joint.name, Number(event.target.value) / factor)} className="block h-6 w-full accent-[var(--foreground)]" />
      <div className="flex justify-between text-xs text-faint"><span>{min.toFixed(0)}{unit}</span><span>{max.toFixed(0)}{unit}</span></div>
      <button type="button" onClick={onReset} disabled={disabled} className="rounded-lg border border-edge px-3 py-1.5 text-xs hover:bg-subtle">Reset all joints</button>
      <p className="text-xs leading-relaxed text-muted">Explore joint movement within the model’s limits. Visual posing only; balance, collisions, and physical motion are not simulated.</p>
      {joint.lower === null || joint.upper === null ? <p className="text-xs text-faint">This joint has no complete source limits; the slider uses an inspection range.</p> : null}
    </div>
  </details>;
}
