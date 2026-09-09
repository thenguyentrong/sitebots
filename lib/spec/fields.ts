// The canonical field registry. Adapters map raw labels onto these ids, the
// normaliser converts into the canonical unit, the merge step projects the
// ones with a `column` into robot_current, and the spec table renders them in
// this order. Adding a field means adding it here first.

import { HAND_TYPES, PAYLOAD_QUALIFIERS, RUNTIME_BASIS } from './enums';

export type FieldKind = 'number' | 'range' | 'text' | 'bool' | 'list' | 'json';

export type FieldGroup =
  | 'physical'
  | 'kinematics'
  | 'payload'
  | 'mobility'
  | 'power'
  | 'parts'
  | 'equipment'
  | 'environment'
  | 'construction'
  | 'commercial';

export type UnitFamily = 'length' | 'mass' | 'speed' | 'time' | 'energy' | 'temperature' | 'angle' | 'count' | 'none';

export type FieldDef = {
  id: string;
  label: string;
  group: FieldGroup;
  kind: FieldKind;
  /** Canonical unit the value is stored in. */
  unit?: string;
  family?: UnitFamily;
  decimals?: number;
  /** Allowed qualifiers; a fact with another qualifier is rejected at normalise time. */
  qualifiers?: readonly string[];
  /** robot_current column fed by this field (single-value fields only). */
  column?: string;
  hint?: string;
  /** Shown only when a value exists. Everything else is listed as "not published", because for a construction buyer the gap is the finding. */
  optional?: boolean;
  /** Only meaningful for these form factors; hidden for the others when unknown. */
  formFactors?: readonly ('humanoid' | 'quadruped' | 'mobile_manipulator')[];
  /** Closed vocabulary for a text field; the normaliser maps free text onto it or drops the fact. */
  values?: readonly string[];
  /** json lists from several sources are unioned (deduped on type + name) instead of picking one winner. */
  merge?: 'union';
};

const HANDED = ['humanoid', 'mobile_manipulator'] as const;

const f = (def: FieldDef): FieldDef => def;

export const FIELDS: readonly FieldDef[] = [
  // physical
  f({ id: 'height_m', label: 'Height', group: 'physical', kind: 'range', unit: 'm', family: 'length', decimals: 2, column: 'height_m' }),
  f({ id: 'weight_kg', label: 'Weight', group: 'physical', kind: 'number', unit: 'kg', family: 'mass', decimals: 1, column: 'weight_kg' }),
  f({ id: 'reach_m', label: 'Reach', group: 'physical', kind: 'number', unit: 'm', family: 'length', decimals: 2, column: 'reach_m', hint: 'Vertical reach of the hand from the floor.' }),
  f({ id: 'footprint', label: 'Footprint', group: 'physical', kind: 'text', hint: 'L × W × H standing or shipping.', optional: true }),
  f({ id: 'shipping_weight_kg', label: 'Shipping weight', group: 'physical', kind: 'number', unit: 'kg', family: 'mass', decimals: 1, optional: true }),
  f({ id: 'structural_material', label: 'Structure', group: 'physical', kind: 'text', optional: true }),

  // kinematics
  f({ id: 'dof_total', label: 'Degrees of freedom', group: 'kinematics', kind: 'number', family: 'count', column: 'dof_total' }),
  f({ id: 'dof_body', label: 'DOF body', group: 'kinematics', kind: 'number', family: 'count', column: 'dof_body', optional: true }),
  f({ id: 'dof_arms', label: 'DOF arms', group: 'kinematics', kind: 'number', family: 'count', column: 'dof_arms', hint: 'Both arms together.', optional: true }),
  f({ id: 'dof_legs', label: 'DOF legs', group: 'kinematics', kind: 'number', family: 'count', column: 'dof_legs', optional: true }),
  f({ id: 'dof_hands', label: 'DOF hands', group: 'kinematics', kind: 'number', family: 'count', column: 'dof_hands', formFactors: HANDED }),
  f({ id: 'hand_type', label: 'Hands', group: 'parts', kind: 'text', formFactors: HANDED, values: HAND_TYPES }),
  f({ id: 'hand_model', label: 'Hand model', group: 'parts', kind: 'text', formFactors: HANDED, optional: true }),
  f({ id: 'finger_count', label: 'Fingers', group: 'parts', kind: 'number', family: 'count', formFactors: HANDED, optional: true }),

  // payload
  f({ id: 'payload_kg', label: 'Payload', group: 'payload', kind: 'number', unit: 'kg', family: 'mass', decimals: 1, qualifiers: PAYLOAD_QUALIFIERS }),

  // mobility
  f({ id: 'walk_speed_ms', label: 'Walking speed', group: 'mobility', kind: 'number', unit: 'm/s', family: 'speed', decimals: 2, column: 'walk_speed_ms' }),
  f({ id: 'max_speed_ms', label: 'Max speed', group: 'mobility', kind: 'number', unit: 'm/s', family: 'speed', decimals: 2, column: 'max_speed_ms' }),
  f({ id: 'stair_capable', label: 'Stairs', group: 'mobility', kind: 'bool', column: 'stair_capable' }),
  f({ id: 'max_slope_deg', label: 'Max slope', group: 'mobility', kind: 'number', unit: '°', family: 'angle', column: 'max_slope_deg' }),
  f({ id: 'step_height_m', label: 'Step height', group: 'mobility', kind: 'number', unit: 'm', family: 'length', decimals: 2, column: 'step_height_m' }),
  f({ id: 'terrain_notes', label: 'Terrain', group: 'mobility', kind: 'text' }),

  // power
  f({ id: 'battery_wh', label: 'Battery', group: 'power', kind: 'number', unit: 'Wh', family: 'energy', column: 'battery_wh' }),
  f({ id: 'runtime_h', label: 'Runtime', group: 'power', kind: 'number', unit: 'h', family: 'time', decimals: 1, qualifiers: RUNTIME_BASIS, column: 'runtime_h', hint: 'Nameplate. A loaded shift yields roughly half.' }),
  f({ id: 'charge_time_h', label: 'Charge time', group: 'power', kind: 'number', unit: 'h', family: 'time', decimals: 1, column: 'charge_time_h' }),
  f({ id: 'hot_swap', label: 'Battery swap', group: 'power', kind: 'bool', column: 'hot_swap' }),
  f({ id: 'swap_time_min', label: 'Swap time', group: 'power', kind: 'number', unit: 'min', family: 'time', optional: true }),

  // built-in parts: what ships inside. Scalars render as rows; the json lists get their own panel.
  f({ id: 'compute_module', label: 'Compute', group: 'parts', kind: 'text', column: 'compute_module' }),
  f({ id: 'compute_tops', label: 'AI compute', group: 'parts', kind: 'number', unit: 'TOPS', family: 'none', column: 'compute_tops', optional: true }),
  f({ id: 'has_lidar', label: 'LiDAR', group: 'parts', kind: 'bool' }),
  f({ id: 'lidar_model', label: 'LiDAR model', group: 'parts', kind: 'text', optional: true }),
  f({ id: 'cameras', label: 'Cameras', group: 'parts', kind: 'text' }),
  f({ id: 'force_torque', label: 'Force/torque sensing', group: 'parts', kind: 'bool', optional: true }),
  f({ id: 'connectivity', label: 'Connectivity', group: 'parts', kind: 'text', optional: true }),
  f({ id: 'sensors', label: 'Sensors', group: 'parts', kind: 'json', optional: true, hint: 'Typed list: lidar, depth and RGB cameras, IMU, force/torque …' }),
  f({ id: 'actuators', label: 'Actuators', group: 'parts', kind: 'json', optional: true, hint: 'Per joint group: drive type, count, peak torque.' }),
  f({ id: 'battery_pack', label: 'Battery pack', group: 'parts', kind: 'json', optional: true, hint: 'Chemistry, voltage, capacity, packs, swappable.' }),

  // equipment options: what the maker or a partner sells to attach
  f({ id: 'equipment_options', label: 'Equipment options', group: 'equipment', kind: 'json', optional: true, merge: 'union', hint: 'Arms, grippers, sensors, docks, radios — only where someone sells them.' }),

  // environment
  f({ id: 'ip_rating', label: 'IP rating', group: 'environment', kind: 'text', column: 'ip_rating' }),
  f({ id: 'operating_temp_c', label: 'Operating temperature', group: 'environment', kind: 'range', unit: '°C', family: 'temperature', decimals: 0 }),
  f({ id: 'outdoor_rated', label: 'Outdoor use', group: 'environment', kind: 'bool', column: 'outdoor_rated' }),
  f({ id: 'noise_db', label: 'Noise', group: 'environment', kind: 'number', unit: 'dB', family: 'none', column: 'noise_db' }),
  f({ id: 'collaborative', label: 'Works next to people', group: 'environment', kind: 'bool' }),

  // construction (curated)
  f({ id: 'certifications', label: 'Certifications', group: 'construction', kind: 'list', column: 'certifications' }),
  f({ id: 'task_capabilities', label: 'Site tasks', group: 'construction', kind: 'list', column: 'task_capabilities' }),
  f({ id: 'requires_operator', label: 'Operator', group: 'construction', kind: 'text', column: 'requires_operator' }),
  f({ id: 'trl', label: 'Readiness (TRL)', group: 'construction', kind: 'number', family: 'count', column: 'trl' }),
  f({ id: 'deployment_evidence', label: 'Deployments', group: 'construction', kind: 'json', optional: true }),

  // commercial
  f({ id: 'warranty_months', label: 'Warranty', group: 'commercial', kind: 'number', unit: 'months', family: 'none', optional: true }),
  f({ id: 'availability_note', label: 'Availability', group: 'commercial', kind: 'text', optional: true }),
];

/** Fields to list for a robot: those with a value, plus the non-optional ones that apply to its form factor. */
export function visibleFields(formFactor: string, presentIds: ReadonlySet<string>): FieldDef[] {
  return FIELDS.filter((d) => {
    if (presentIds.has(d.id)) return true;
    if (d.optional) return false;
    if (d.formFactors && !d.formFactors.includes(formFactor as 'humanoid')) return false;
    return true;
  });
}

export const FIELD_MAP: ReadonlyMap<string, FieldDef> = new Map(FIELDS.map((d) => [d.id, d]));

export function fieldDef(id: string): FieldDef | undefined {
  return FIELD_MAP.get(id);
}

/** `panel` groups are rendered by their own card, not as rows of the spec table. */
export const GROUPS: readonly { id: FieldGroup; label: string; panel?: boolean }[] = [
  { id: 'physical', label: 'Size and weight' },
  { id: 'payload', label: 'Payload' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'power', label: 'Power' },
  { id: 'environment', label: 'Environment' },
  { id: 'construction', label: 'On site' },
  { id: 'kinematics', label: 'Kinematics' },
  { id: 'parts', label: 'Built-in parts', panel: true },
  { id: 'equipment', label: 'Equipment options', panel: true },
  { id: 'commercial', label: 'Commercial' },
];

/** `field` or `field:qualifier` — the key used in robot_current.specs. */
export function specKey(field: string, qualifier?: string | null): string {
  return qualifier ? `${field}:${qualifier}` : field;
}

export function splitSpecKey(key: string): { field: string; qualifier: string | null } {
  const i = key.indexOf(':');
  return i === -1 ? { field: key, qualifier: null } : { field: key.slice(0, i), qualifier: key.slice(i + 1) };
}
