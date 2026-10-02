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

export type TaskCoverage = { supported: number; reported: number; unknown: number; total: number };

function handlingCoverage(c: Candidate): TaskCoverage {
  const rows = taskRows(c).rows.filter((r) => ['teleoperated_manipulation', 'shelf_pick', 'tool_handoff', 'drilling', 'screwing', 'material_sorting'].includes(r.id));
  return {
    supported: rows.filter((r) => r.status === 'yes').length,
    reported: rows.filter((r) => r.status === 'partial').length,
    unknown: rows.filter((r) => r.status === 'unknown').length,
    total: rows.length,
  };
}

function manipulation(c: Candidate): Part[] {
  const coverage = handlingCoverage(c);
  const text = coverage.supported + ' supported; ' + coverage.reported + ' reported only; ' + coverage.unknown + ' unconfirmed. Counts describe evidence, not task success.';
  // Averaging only known tasks made one supported task appear as 100/100.
  if (coverage.unknown || coverage.reported) return [{ score: null, status: 'unknown', text }];
  return [{ score: coverage.supported / coverage.total, status: 'known', text }];
}
function speed(c: Candidate): Part[] {
  const v = c.card.max_speed_ms ?? c.card.walk_speed_ms;
  if (v === null) return [{ score: null, status: 'unknown', text: 'speed not published' }];
  const rungs = [0.5, 1.0, 1.5, 2.0, 3.0];
  return [{ score: rungs.filter((r) => v >= r).length / rungs.length, status: 'known', text: `${f1(v)} m/s ${c.card.max_speed_ms !== null ? 'max' : 'walking'}` }];
}

export const AXES: readonly AxisDef[] = [
  { id: 'carry', label: 'Carry', hint: 'Rated payload against 5, 10, 20, 40 and 80 kg.', derive: (c) => [ladder(c, payload, 'payload_kg', [5, 10, 20, 40, 80])] },
  { id: 'reach', label: 'Reach', hint: 'Work height against 1.0, 1.5, 2.0 and 2.5 m; unknown when working reach is not published.', derive: (c) => [ladder(c, reach, 'reach_height_m', [1.0, 1.5, 2.0, 2.5])] },
  { id: 'stairs', label: 'Stairs & slope', hint: 'Stair capability, and slope against 10, 20, 30 and 45°.', derive: (c) => [single(c, stairs, { stairs: 'required' }), ladder(c, slope, 'slope_deg', [10, 20, 30, 45])] },
  { id: 'terrain', label: 'Terrain', hint: 'Configuration-specific evidence for gravel and rubble.', derive: (c) => [single(c, terrain, { terrain: 'gravel' }), single(c, terrain, { terrain: 'rubble' })] },
  { id: 'weather', label: 'Weather', hint: 'Heavy dust, damp and rain (IP code), outdoor rating, and −10…35 °C / −20…45 °C.', derive: (c) => [single(c, dust, { dust: 'high' }), ladder(c, wet, 'wet', ['damp', 'rain']), single(c, outdoor, { environment: 'outdoor' }), ladder(c, temperature, 'temp_min_c', [-10, -20], { temp_max_c: 35 })] },
  { id: 'endurance', label: 'Endurance', hint: 'Published loaded runtime against 2, 4 and 8 h shifts; nominal/idle figures remain unconfirmed.', derive: (c) => [ladder(c, runtime, 'runtime_h_per_shift', [2, 4, 8], { hot_swap_acceptable: true })] },
  { id: 'autonomy', label: 'Autonomy', hint: 'Supervised, then fully autonomous operation.', derive: (c) => [ladder(c, autonomy, 'autonomy', ['supervised', 'autonomous'])] },
  { id: 'manipulation', label: 'Handling evidence', hint: 'Supported, reported and unconfirmed handling tasks. Incomplete evidence leaves a chart gap, not a success score.', derive: manipulation },
  { id: 'speed', label: 'Speed', hint: 'Max (or walking) speed against 0.5, 1, 1.5, 2 and 3 m/s.', derive: speed },
  { id: 'evidence', label: 'Evidence', hint: 'How much of the record is published and maker-verified.', derive: (c) => [single(c, () => evidence(c), {})] },
];

export type Axis = { id: string; label: string; hint: string; score: number | null; status: 'known' | 'partial' | 'unknown'; basis: string; coverage?: TaskCoverage };

export function axesFor(c: Candidate): Axis[] {
  return AXES.map((a) => ({ id: a.id, label: a.label, hint: a.hint, ...combine(a.derive(c)), ...(a.id === 'manipulation' ? { coverage: handlingCoverage(c) } : {}) }));
}
