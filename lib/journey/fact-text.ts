import type { Facts } from '@/lib/screen/facts';
import {
  DATA_SENSITIVITY_LABELS,
  DUST_TYPE_LABELS,
  DUST_ZONE_LABELS,
  ERROR_TOLERANCE_LABELS,
  EXPOSURE_LABELS,
  FLOOR_LABELS,
  INCUMBENT_LABELS,
  SAFETY_LABELS,
  VARIABILITY_LABELS,
  WET_LABELS,
} from './labels';

/** One fact as a reader sees it: "21.3–31.9 kg", "Controlled, no classified zone". */
export function factText(key: keyof Facts, facts: Partial<Facts>, machines: Record<string, string> = {}): string {
  const value = facts[key];
  if (value === null || value === undefined) return 'Not established';
  switch (key) {
    case 'object_mass_kg': { const r = value as { min: number; max: number }; return r.max === 0 ? 'No payload' : r.min === r.max ? `${r.max.toLocaleString('en-GB')} kg` : r.min === 0 ? `up to ${r.max.toLocaleString('en-GB')} kg` : `${r.min.toLocaleString('en-GB')}–${r.max.toLocaleString('en-GB')} kg`; }
    case 'reach_height_m': { const r = value as { min: number; max: number }; return r.min === r.max ? `${r.max} m` : r.min === 0 ? `up to ${r.max} m` : `${r.min}–${r.max} m`; }
    case 'variability': return VARIABILITY_LABELS[value as Facts['variability'] & string];
    case 'error_tolerance': return ERROR_TOLERANCE_LABELS[value as Facts['error_tolerance'] & string];
    case 'safety_criticality': return SAFETY_LABELS[value as Facts['safety_criticality'] & string];
    case 'environment': return EXPOSURE_LABELS[value as Facts['environment'] & string];
    case 'dust': { const d = value as NonNullable<Facts['dust']>; return d.zone === 'none' ? DUST_ZONE_LABELS.none : `${DUST_TYPE_LABELS[d.type]} dust, ${DUST_ZONE_LABELS[d.zone].toLowerCase()}`; }
    case 'wet': return WET_LABELS[value as Facts['wet'] & string];
    case 'floor': return FLOOR_LABELS[value as Facts['floor'] & string];
    case 'incumbent_automation': { const i = value as NonNullable<Facts['incumbent_automation']>; return INCUMBENT_LABELS[i.status] + (i.machine_classes.length ? ` (${i.machine_classes.map((m) => machines[m] ?? m).join(', ')})` : ''); }
    case 'data_sensitivity': return DATA_SENSITIVITY_LABELS[value as Facts['data_sensitivity'] & string];
    case 'runtime_continuous_min': return `${value} min`;
  }
}
