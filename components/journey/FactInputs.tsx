'use client';

import { useId } from 'react';
import { DATA_SENSITIVITY, DUST_TYPES, DUST_ZONES, ERROR_TOLERANCE, EXPOSURES, FLOORS, INCUMBENT_STATUS, SAFETY_CRITICALITY, VARIABILITY, WET_LEVELS } from '@/lib/content/vocab';
import {
  DATA_SENSITIVITY_LABELS,
  DUST_TYPE_LABELS,
  DUST_ZONE_HINTS,
  DUST_ZONE_LABELS,
  ERROR_TOLERANCE_LABELS,
  EXPOSURE_LABELS,
  FLOOR_LABELS,
  INCUMBENT_LABELS,
  NOT_SURE_LABEL,
  SAFETY_LABELS,
  VARIABILITY_LABELS,
  WET_LABELS,
} from '@/lib/journey/labels';
import { FACT_LABELS, type Facts } from '@/lib/screen/facts';
import type { FactKey } from '@/lib/screen/types';
import type { FactMetaMap, MachineClassOption } from '@/lib/tasks/types';
import { ChipChecks, ChoiceChips, Row, type Choice } from './ChoiceChips';

type Value<K extends FactKey> = Facts[K];
export type FactChange = <K extends FactKey>(key: K, value: Value<K>) => void;
const chips = <T extends string>(options: readonly T[], labels: Record<T, string>, hints?: Partial<Record<T, string>>): Choice<T>[] => options.map((value) => ({ value, label: labels[value], hint: hints?.[value] }));

function Num({ label, hint, value, unit, step = 'any', placeholder = NOT_SURE_LABEL, onChange }: { label: string; hint?: string; value: number | null; unit: string; step?: string; placeholder?: string; onChange: (value: number | null) => void }) {
  const id = useId();
  return <Row label={label} hint={hint} htmlFor={id}><div className="jp-input"><input id={id} type="number" min="0" step={step} value={value ?? ''} placeholder={placeholder} onChange={(event) => {
    const n = Number(event.target.value);
    onChange(event.target.value.trim() === '' || !Number.isFinite(n) || n < 0 ? null : n);
  }} /><span>{unit}</span></div></Row>;
}

/**
 * The facts the screen reads, one question per row. "Not sure" is a chip of
 * its own and stays null: an unanswered question never passes.
 *
 * With `typical` (a library record's values) the record's answer is
 * preselected, numbers show it as the placeholder, and "not sure" appears
 * only where the record has no value; `facts` then holds just the visitor's
 * own answers. `brief` leaves out the follow-up rows (dust type, which
 * machine) that never change the verdict.
 */
export function FactInputs({ facts, onChange, keys, machineClasses, notes, hints, labels, typical, brief = false }: {
  facts: Partial<Facts>; onChange: FactChange; keys?: readonly FactKey[]; machineClasses: MachineClassOption[]; notes?: FactMetaMap;
  hints?: Partial<Record<FactKey, string>>; labels?: Partial<Record<FactKey, string>>; typical?: Partial<Facts>; brief?: boolean;
}) {
  const show = (key: FactKey) => !keys || keys.includes(key);
  const hint = (key: FactKey) => hints?.[key] ?? notes?.[key]?.note;
  const label = (key: FactKey) => labels?.[key] ?? FACT_LABELS[key];
  const current = <K extends FactKey>(key: K) => (facts[key] ?? typical?.[key] ?? null) as Facts[K] | null;
  const unsure = (key: FactKey) => typical?.[key] === undefined || typical[key] === null;
  const placeholder = (n: number | null | undefined) => (n === null || n === undefined ? undefined : n.toLocaleString('en-GB'));
  const incumbent = current('incumbent_automation');
  const dust = current('dust');
  return <div className="jp-rows">
    {show('object_mass_kg') ? <Num label={label('object_mass_kg')} hint={hint('object_mass_kg')} unit="kg" value={facts.object_mass_kg?.max ?? null} placeholder={placeholder(typical?.object_mass_kg?.max)} onChange={(n) => onChange('object_mass_kg', n === null ? null : { min: 0, max: n })} /> : null}
    {show('variability') ? <ChoiceChips label={label('variability')} hint={hint('variability')} value={current('variability')} notSure={unsure('variability')} choices={chips(VARIABILITY, VARIABILITY_LABELS)} onChange={(v) => onChange('variability', v)} /> : null}
    {show('error_tolerance') ? <ChoiceChips label={label('error_tolerance')} hint={hint('error_tolerance')} value={current('error_tolerance')} notSure={unsure('error_tolerance')} choices={chips(ERROR_TOLERANCE, ERROR_TOLERANCE_LABELS)} onChange={(v) => onChange('error_tolerance', v)} /> : null}
    {show('safety_criticality') ? <ChoiceChips label={label('safety_criticality')} hint={hint('safety_criticality')} value={current('safety_criticality')} notSure={unsure('safety_criticality')} choices={chips(SAFETY_CRITICALITY, SAFETY_LABELS)} onChange={(v) => onChange('safety_criticality', v)} /> : null}
    {show('incumbent_automation') ? <>
      <ChoiceChips label={label('incumbent_automation')} hint={hint('incumbent_automation')} value={incumbent?.status ?? null} notSure={unsure('incumbent_automation')} choices={chips(INCUMBENT_STATUS, INCUMBENT_LABELS)} onChange={(status) => onChange('incumbent_automation', status === null ? null : { status, machine_classes: status === 'none' ? [] : incumbent?.machine_classes ?? [] })} />
      {!brief && incumbent && incumbent.status !== 'none' ? <ChipChecks label="Which machine class?" values={incumbent.machine_classes} choices={machineClasses.map((m) => ({ value: m.id, label: m.title.en }))} onToggle={(id) => onChange('incumbent_automation', { status: incumbent.status, machine_classes: incumbent.machine_classes.includes(id) ? incumbent.machine_classes.filter((x) => x !== id) : [...incumbent.machine_classes, id] })} /> : null}
    </> : null}
    {show('dust') ? <>
      <ChoiceChips label={labels?.dust ?? 'Dust zone at the step'} hint={hint('dust')} value={dust?.zone ?? null} notSure={unsure('dust')} choices={chips(DUST_ZONES, DUST_ZONE_LABELS, DUST_ZONE_HINTS)} onChange={(zone) => onChange('dust', zone === null ? null : { type: zone === 'none' ? 'none' : dust && dust.type !== 'none' ? dust.type : 'mixed', zone })} />
      {brief ? null : <ChoiceChips label="Dust type" value={dust?.type ?? null} notSure={unsure('dust')} choices={chips(DUST_TYPES, DUST_TYPE_LABELS)} onChange={(type) => onChange('dust', type === null ? (dust ? { type: 'mixed', zone: dust.zone } : null) : { type, zone: dust?.zone ?? 'controlled' })} />}
    </> : null}
    {show('reach_height_m') ? <Num label={label('reach_height_m')} hint={hint('reach_height_m')} unit="m" step="0.1" value={facts.reach_height_m?.max ?? null} placeholder={placeholder(typical?.reach_height_m?.max)} onChange={(n) => onChange('reach_height_m', n === null ? null : { min: 0, max: n })} /> : null}
    {show('environment') ? <ChoiceChips label={label('environment')} hint={hint('environment')} value={current('environment')} notSure={unsure('environment')} choices={chips(EXPOSURES, EXPOSURE_LABELS)} onChange={(v) => onChange('environment', v)} /> : null}
    {show('wet') ? <ChoiceChips label={label('wet')} hint={hint('wet')} value={current('wet')} notSure={unsure('wet')} choices={chips(WET_LEVELS, WET_LABELS)} onChange={(v) => onChange('wet', v)} /> : null}
    {show('floor') ? <ChoiceChips label={label('floor')} hint={hint('floor')} value={current('floor')} notSure={unsure('floor')} choices={chips(FLOORS, FLOOR_LABELS)} onChange={(v) => onChange('floor', v)} /> : null}
    {show('data_sensitivity') ? <ChoiceChips label={label('data_sensitivity')} hint={hint('data_sensitivity')} value={current('data_sensitivity')} notSure={unsure('data_sensitivity')} choices={chips(DATA_SENSITIVITY, DATA_SENSITIVITY_LABELS)} onChange={(v) => onChange('data_sensitivity', v)} /> : null}
    {show('runtime_continuous_min') ? <Num label={label('runtime_continuous_min')} hint={hint('runtime_continuous_min')} unit="min" step="1" value={facts.runtime_continuous_min ?? null} placeholder={placeholder(typical?.runtime_continuous_min)} onChange={(n) => onChange('runtime_continuous_min', n)} /> : null}
  </div>;
}
