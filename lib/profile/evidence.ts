import type { Candidate } from '@/lib/match/types';
import type { SpecValue } from '@/lib/spec/types';
import { fieldDef } from '@/lib/spec/fields';
import { formatSpec, qualifierLabel } from '@/lib/spec/display';
import { conservativePayload, publishedLowerBound } from '@/lib/spec/payload';
import type { Trust } from '@/lib/spec/enums';

export type ProfileFact = { key: string; label: string; value: string; trust: Trust; sourceUrl: string; checkedAt: string; note: string | null };
export type AxisEvidence = { facts: ProfileFact[]; missing: string[]; question: string };
export type EvidenceSummary = { published: number; verified: number; assessed: number; reported: number; unknown: number; sources: number; latest: string | null };

const TOPICS: Record<string, { fields: string[]; needed: { keys: string[]; label: string }[]; question: string }> = {
  carry: { fields:['payload_kg'], needed:[{keys:['payload_kg:rated','payload_kg:sustained','payload_kg:rated_dual','payload_kg:carry_walking'],label:'Rated working load, arm pose and whether the figure is per arm or combined'}], question:'What load can this exact configuration sustain while doing the intended task?' },
  reach: { fields:['reach_m'], needed:[{keys:['reach_m'],label:'Vertical working reach from the floor, including the end effector'}], question:'What usable tool height and work envelope are supported by the fitted arm and base?' },
  stairs: { fields:['stair_capable','step_height_m','max_slope_deg'], needed:[{keys:['stair_capable'],label:'Explicit stair-climbing capability'},{keys:['step_height_m'],label:'Maximum step height and test conditions'},{keys:['max_slope_deg'],label:'Maximum slope and test surface'}], question:'Which stair geometry, surface and carried load were tested?' },
  terrain: { fields:['terrain_notes'], needed:[{keys:['terrain_notes'],label:'Named terrain and configuration-specific test evidence'}], question:'Is gravel or rubble explicitly supported for this configuration? General uneven-ground claims do not establish both.' },
  weather: { fields:['ip_rating','outdoor_rated','temp_min_c','temp_max_c'], needed:[{keys:['ip_rating'],label:'Whole-robot IP rating'},{keys:['outdoor_rated'],label:'Explicit outdoor-use permission or restriction'},{keys:['temp_min_c','temp_max_c'],label:'Complete operating temperature range'}], question:'Do weather ratings apply to the whole robot, including its hands, sensors and battery?' },
  endurance: { fields:['runtime_h','hot_swap','swap_time_min'], needed:[{keys:['runtime_h:loaded'],label:'Loaded working runtime with workload stated'}], question:'How long does it operate with the intended payload and duty cycle, including recharge or battery changes?' },
  autonomy: { fields:['requires_operator','task_capabilities'], needed:[{keys:['requires_operator'],label:'Operator role and supported autonomous workflow'}], question:'Which tasks run without teleoperation, and when must a person intervene?' },
  manipulation: { fields:['task_capabilities','hand_type','hand_model','force_torque'], needed:[{keys:['task_capabilities'],label:'Evidence for the required handling task and fitted end effector'}], question:'Which grasp, tool and handling tasks have been shown with this exact end effector?' },
  speed: { fields:['max_speed_ms','walk_speed_ms'], needed:[{keys:['max_speed_ms','walk_speed_ms'],label:'Published walking or maximum speed with conditions'}], question:'Is this maximum speed or sustained operating speed, and under what load?' },
  evidence: { fields:[], needed:[], question:'Which claims have primary sources, and which still need manufacturer confirmation or a task trial?' },
};

export const hasValue = (s: SpecValue | undefined): s is SpecValue => !!s && (s.min != null || s.max != null || (s.value !== null && s.value !== '' && (!Array.isArray(s.value) || s.value.length > 0)));
export function factFor(key: string, spec: SpecValue): ProfileFact {
  const [field, qualifier] = key.split(':');
  return { key, label: (fieldDef(field)?.label ?? field.replaceAll('_',' ')) + (qualifier ? ' · '+qualifierLabel(qualifier) : ''), value: formatSpec(key,spec), trust: spec.trust, sourceUrl: spec.evidence_url || spec.source_url, checkedAt: spec.observed_at, note: spec.note || null };
}

export function evidenceForAxis(c: Candidate, axisId: string): AxisEvidence {
  const topic = TOPICS[axisId] ?? TOPICS.evidence;
  const specs = c.card.specs ?? {};
  const entries = Object.entries(specs).filter(([,spec])=>hasValue(spec));
  const facts = entries.filter(([key])=>topic.fields.includes(key.split(':')[0])).map(([key,spec])=>factFor(key,spec));
  const missing = topic.needed.filter(group => {
    // A temperature range needs both ends; either speed measurement can fill the speed question.
    if (axisId === 'carry' || axisId === 'endurance') return !group.keys.some(k => publishedLowerBound(specs[k]) !== null);
    return axisId === 'weather' && group.keys.includes('temp_min_c') ? !group.keys.every(k=>hasValue(specs[k])) : !group.keys.some(k=>hasValue(specs[k]));
  }).map(group=>group.label);
  if (axisId === 'carry') {
    const selected = conservativePayload(specs);
    if (!missing.length && selected.conservative === null) missing.push('A usable working-load measurement from the selected payload source');
    else if (!missing.length && selected.key && !['verified','assessed'].includes(specs[selected.key].trust)) missing.push('Manufacturer confirmation of the reported working-load figure');
  }
  if (axisId === 'endurance' && hasValue(specs['runtime_h:loaded']) && ['reported','unknown'].includes(specs['runtime_h:loaded'].trust)) missing.push('Manufacturer confirmation of the loaded runtime');
  if (axisId === 'terrain') missing.push('Reviewed evidence for gravel and rubble separately');
  return {facts,missing,question:topic.question};
}

export function profileEvidenceSummary(c: Candidate): EvidenceSummary {
  const values=Object.values(c.card.specs??{}).filter(hasValue);
  const dates=values.map(s=>s.observed_at).filter(s=>/^\d{4}-\d{2}-\d{2}/.test(s)).sort();
  return {published:values.length,verified:values.filter(s=>s.trust==='verified').length,assessed:values.filter(s=>s.trust==='assessed').length,reported:values.filter(s=>s.trust==='reported').length,unknown:values.filter(s=>s.trust==='unknown').length,sources:new Set(values.map(s=>s.evidence_url||s.source_url).filter(Boolean)).size,latest:dates.at(-1)??null};
}
