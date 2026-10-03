import { FIELDS, missingFields, type Field } from './research';
import type { Dossier } from './schema';

export type MarketSource = Dossier['sources'][number];
type CapabilityKey = Exclude<keyof Dossier['capabilities'], 'sourceIds' | 'notes'>;

export type MarketClaim = { source: MarketSource; quote: string; basis: string | null; checkedAt: string };

export type MarketValueRow = {
  key: string;
  label: string;
  value: string | number | boolean | null;
  unit: string | null;
  conditions: string | null;
  source: MarketSource | null;
  quote: string | null;
  quoteBasis: string | null;
  additionalClaims: MarketClaim[];
  checkedAt: string | null;
  notApplicable?: boolean;
};

const CAPABILITIES: { key: CapabilityKey; label: string; field?: Field; unit?: string }[] = [
  { key: 'legs', label: 'Legs' },
  { key: 'wheels', label: 'Wheels' },
  { key: 'tracks', label: 'Tracks' },
  { key: 'levelFloors', label: 'Level floors' },
  { key: 'roughGround', label: 'Rough ground', field: 'rough_ground' },
  { key: 'stairs', label: 'Stairs', field: 'stairs' },
  { key: 'outdoor', label: 'Outdoor use', field: 'outdoor' },
  { key: 'arms', label: 'Number of arms' },
  { key: 'hands', label: 'Hands or end effectors' },
  { key: 'handsIncluded', label: 'Hands included', field: 'hands_included' },
  { key: 'armPayloadKg', label: 'Payload per arm', field: 'arm_payload_kg', unit: 'kg' },
  { key: 'carryPayloadKg', label: 'Payload on body or base', field: 'carry_payload_kg', unit: 'kg' },
  { key: 'runtimeH', label: 'Runtime', field: 'runtime_h', unit: 'h' },
  { key: 'ipRating', label: 'IP rating', field: 'ip_rating' },
  { key: 'sdk', label: 'SDK / development interface' },
];

const HAND_LABELS: Record<Dossier['capabilities']['hands'], string> = {
  none: 'None', gripper: 'Gripper', dexterous: 'Dexterous hands', tool: 'Tool', optional: 'Optional',
};

export function marketSourceLabel(source: MarketSource): string {
  return source.kind === 'manufacturer' ? 'Manufacturer source' : 'Reported · ' + source.kind.replaceAll('_', ' ');
}

export function marketValue(row: Pick<MarketValueRow, 'value' | 'unit' | 'notApplicable'>): string {
  if (row.notApplicable) return 'Not applicable';
  if (row.value === null) return 'Unknown';
  const value = typeof row.value === 'boolean' ? (row.value ? 'Yes' : 'No') : String(row.value);
  return value + (row.unit ? ' ' + row.unit : '');
}

/** A capability source list covers the whole record; it cannot verify an individual field. */
export function configurationSpecifications(robot: Dossier) {
  const sources = new Map(robot.sources.map((source) => [source.id, source]));
  const evidence = robot.researchEvidence ?? [];
  const specs: MarketValueRow[] = robot.specs.map((spec) => {
    const quoted = evidence.find((item) => item.field === spec.key && item.value === spec.value && item.sourceId === spec.sourceId);
    const source = sources.get(spec.sourceId) ?? null;
    return {
      ...spec,
      source,
      quote: quoted?.quote ?? spec.quote ?? null,
      quoteBasis: quoted?.basis ?? spec.conditions,
      additionalClaims: evidence.filter(item => item.field === spec.key && item.value === spec.value && item.sourceId !== spec.sourceId).flatMap(item => {
        const claimSource = sources.get(item.sourceId);
        return claimSource ? [{ source: claimSource, quote: item.quote, basis: item.basis, checkedAt: item.checkedAt }] : [];
      }),
      checkedAt: quoted?.checkedAt ?? source?.checkedAt ?? null,
      conditions: spec.conditions ?? quoted?.basis ?? null,
    };
  });
  const gaps = missingFields(robot);
  const capabilities: MarketValueRow[] = CAPABILITIES.flatMap(({ key, label, field, unit }) => {
    const value = robot.capabilities[key];
    const specKey = field ? FIELDS[field].spec : null;
    const spec = specKey ? specs.find((item) => item.key === specKey && item.value === value) : undefined;
    // Equal values are already shown with the exact configuration's specification source.
    if (spec) return [];
    const quoted = field ? evidence.find((item) => item.field === field && item.value === value) : undefined;
    const source = quoted ? sources.get(quoted.sourceId) ?? null : null;
    return [{
      key,
      label,
      value: key === 'hands' ? HAND_LABELS[value as Dossier['capabilities']['hands']] : value,
      unit: unit ?? null,
      conditions: quoted?.basis ?? null,
      source,
      quote: quoted?.quote ?? null,
      quoteBasis: quoted?.basis ?? null,
      additionalClaims: evidence.filter(item => item.field === field && item.value === value && item !== quoted).flatMap(item => {
        const claimSource = sources.get(item.sourceId);
        return claimSource ? [{ source: claimSource, quote: item.quote, basis: item.basis, checkedAt: item.checkedAt }] : [];
      }),
      checkedAt: quoted?.checkedAt ?? null,
      notApplicable: value === null && !!field && !gaps.includes(field),
    }];
  });
  const missing = gaps.map((field) => FIELDS[field].label as string);
  if (robot.capabilities.sdk === null) missing.push('SDK / development interface');
  const summary = [
    { key: 'arm_payload_kg', capability: 'armPayloadKg', label: 'Per arm' },
    { key: 'carry_payload_kg', capability: 'carryPayloadKg', label: 'Body / base payload' },
    { key: 'runtime_h', capability: 'runtimeH', label: 'Runtime' },
    { key: 'ip_rating', capability: 'ipRating', label: 'IP rating' },
  ].flatMap(({ key, capability, label }) => {
    const row = specs.find((item) => item.key === key) ?? capabilities.find((item) => item.key === capability);
    return row && row.value !== null ? [{ ...row, label }] : [];
  });
  return { specs, capabilities, missing, summary };
}
