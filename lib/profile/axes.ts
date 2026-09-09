import { autonomy, dust, evidence, outdoor, payload, reach, runtime, slope, stairs, temperature, terrain, wet } from '@/lib/match/criteria';
import type { Candidate } from '@/lib/match/types';
import { combine, ladder, single, type Part } from './ladder';
import { taskRows } from './tasks';

/**
 * The site-condition profile: ten axes, each derived from the matcher's own
 * criteria by asking them at rising requirement values. The rungs are data,
 * listed here and on /methodology, not a formula. Speed and manipulation have
 * no criterion of their own and are the only new scorers.
 */
export type AxisDef = { id: string; label: string; hint: string; derive: (c: Candidate) => Part[] };

const f1 = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 1 });

function manipulation(c: Candidate): Part[] {
  const parts: Part[] = [];
  const hand = c.card.specs?.hand_type?.value;
  if (typeof hand === 'string') {
    const score = { none: 0, gripper: 0.5, three_finger: 0.75, five_finger: 1 }[hand] ?? null;
    parts.push(score === null ? { score: null, status: 'unknown', text: `hands: ${hand}` } : { score, status: 'known', text: `hands: ${hand.replace(/_/g, ' ')}` });
  } else parts.push({ score: null, status: 'unknown', text: 'hand type not published' });
  const dof = c.card.dof_total;
  if (dof === null) parts.push({ score: null, status: 'unknown', text: 'DOF not published' });
  else {
    const rungs = [12, 20, 30, 40];
    parts.push({ score: rungs.filter((r) => dof >= r).length / rungs.length, status: 'known', text: `${dof} DOF` });
  }
  const { rows } = taskRows(c);
  const manip = ['teleoperated_manipulation', 'shelf_pick', 'tool_handoff', 'drilling', 'screwing', 'material_sorting'];
  const relevant = rows.filter((r) => manip.includes(r.id));
  if (relevant.every((r) => r.status === 'unknown')) parts.push({ score: null, status: 'unknown', text: 'tasks not assessed' });
  else {
    const yes = relevant.filter((r) => r.status === 'yes').length + 0.5 * relevant.filter((r) => r.status === 'partial').length;
    parts.push({ score: yes / relevant.length, status: 'known', text: `${yes} of ${relevant.length} handling tasks` });
  }
  return parts;
}

function speed(c: Candidate): Part[] {
  const v = c.card.max_speed_ms ?? c.card.walk_speed_ms;
  if (v === null) return [{ score: null, status: 'unknown', text: 'speed not published' }];
  const rungs = [0.5, 1.0, 1.5, 2.0, 3.0];
  return [{ score: rungs.filter((r) => v >= r).length / rungs.length, status: 'known', text: `${f1(v)} m/s ${c.card.max_speed_ms !== null ? 'max' : 'walking'}` }];
}

export const AXES: readonly AxisDef[] = [
  { id: 'carry', label: 'Carry', hint: 'Rated payload against 5, 10, 20, 40 and 80 kg.', derive: (c) => [ladder(c, payload, 'payload_kg', [5, 10, 20, 40, 80])] },
  { id: 'reach', label: 'Reach', hint: 'Work height against 1.0, 1.5, 2.0 and 2.5 m; estimated from height where reach is not published.', derive: (c) => [ladder(c, reach, 'reach_height_m', [1.0, 1.5, 2.0, 2.5])] },
  { id: 'stairs', label: 'Stairs & slope', hint: 'Stair capability, and slope against 10, 20, 30 and 45°.', derive: (c) => [single(c, stairs, { stairs: 'required' }), ladder(c, slope, 'slope_deg', [10, 20, 30, 45])] },
  { id: 'terrain', label: 'Terrain', hint: 'Gravel (graded by form factor and outdoor rating) and rubble.', derive: (c) => [single(c, terrain, { terrain: 'gravel' }), single(c, terrain, { terrain: 'rubble' })] },
  { id: 'weather', label: 'Weather', hint: 'Heavy dust, damp and rain (IP code), outdoor rating, and −10…35 °C / −20…45 °C.', derive: (c) => [single(c, dust, { dust: 'high' }), ladder(c, wet, 'wet', ['damp', 'rain']), single(c, outdoor, { environment: 'outdoor' }), ladder(c, temperature, 'temp_min_c', [-10, -20], { temp_max_c: 35 })] },
  { id: 'endurance', label: 'Endurance', hint: 'Nameplate runtime against 2, 4 and 8 h shifts, battery swaps allowed.', derive: (c) => [ladder(c, runtime, 'runtime_h_per_shift', [2, 4, 8], { hot_swap_acceptable: true })] },
  { id: 'autonomy', label: 'Autonomy', hint: 'Supervised, then fully autonomous operation.', derive: (c) => [ladder(c, autonomy, 'autonomy', ['supervised', 'autonomous'])] },
  { id: 'manipulation', label: 'Manipulation', hint: 'Hand type, degrees of freedom, and the handling tasks assessed.', derive: manipulation },
  { id: 'speed', label: 'Speed', hint: 'Max (or walking) speed against 0.5, 1, 1.5, 2 and 3 m/s.', derive: speed },
  { id: 'evidence', label: 'Evidence', hint: 'How much of the record is published and maker-verified.', derive: (c) => [single(c, () => evidence(c), {})] },
];

export type Axis = { id: string; label: string; hint: string; score: number | null; status: 'known' | 'partial' | 'unknown'; basis: string };

export function axesFor(c: Candidate): Axis[] {
  return AXES.map((a) => ({ id: a.id, label: a.label, hint: a.hint, ...combine(a.derive(c)) }));
}
