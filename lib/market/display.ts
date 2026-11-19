import type { Lang } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { FIELDS, missingFields, type Field } from './research';
import type { Dossier } from './schema';

// Our own words (row names, yes/no, who states a value) follow the page's language, passed last and
// English by default: compare/facts.ts matches the English row names. Labels the records carry for their
// own specifications stay as the sources wrote them.
const DE = {
  capability: {
    legs: 'Beine', wheels: 'Räder', tracks: 'Ketten', levelFloors: 'Ebene Böden', roughGround: 'Unebener Boden', stairs: 'Treppen', outdoor: 'Einsatz im Freien',
    arms: 'Anzahl der Arme', hands: 'Hände oder Endeffektoren', handsIncluded: 'Hände enthalten', armPayloadKg: 'Traglast pro Arm', carryPayloadKg: 'Traglast auf Körper oder Basis',
    runtimeH: 'Laufzeit', ipRating: 'Schutzart', sdk: 'SDK / Entwicklungsschnittstelle',
  } as Record<string, string>,
  hands: { none: 'Keine', gripper: 'Greifer', dexterous: 'Mehrfingerhände', tool: 'Werkzeug', optional: 'Optional' } as Record<string, string>,
  field: {
    arm_payload_kg: 'Traglast pro Arm', both_arms_payload_kg: 'Traglast, beide Arme', carry_payload_kg: 'Traglast', runtime_h: 'Laufzeit', ip_rating: 'Schutzart',
    stairs: 'Treppen', rough_ground: 'Unebener Boden', outdoor: 'Einsatz im Freien', hands_included: 'Hände enthalten',
  } as Record<string, string>,
  summary: { arm_payload_kg: 'Pro Arm', carry_payload_kg: 'Traglast Körper / Basis', runtime_h: 'Laufzeit', ip_rating: 'Schutzart' } as Record<string, string>,
  kind: { manufacturer: 'Hersteller', seller: 'Händler', press: 'Presse', customer: 'Kunde', trade_fair: 'Messe', database: 'Datenbank', other: 'Sonstige' } as Record<string, string>,
};

/** A research field (payload per arm, IP rating ...) by name, in the page's language. */
export const researchFieldLabel = (field: Field, lang: Lang = 'en'): string => (lang === 'de' ? DE.field[field] : null) ?? FIELDS[field].label;

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

export function marketSourceLabel(source: MarketSource, lang: Lang = 'en'): string {
  if (lang === 'de') return source.kind === 'manufacturer' ? 'Herstellerquelle' : 'Berichtet · ' + (DE.kind[source.kind] ?? source.kind.replaceAll('_', ' '));
  return source.kind === 'manufacturer' ? 'Manufacturer source' : 'Reported · ' + source.kind.replaceAll('_', ' ');
}

export function marketValue(row: Pick<MarketValueRow, 'value' | 'unit' | 'notApplicable'>, lang: Lang = 'en'): string {
  const de = lang === 'de';
  if (row.notApplicable) return de ? 'Entfällt' : 'Not applicable';
  if (row.value === null) return de ? 'Unbekannt' : 'Unknown';
  // Text values are the source's words and stay as written; numbers take the page's decimal mark.
  const value = typeof row.value === 'boolean' ? (row.value ? (de ? 'Ja' : 'Yes') : (de ? 'Nein' : 'No')) : typeof row.value === 'number' && de ? formatNumber(row.value, lang, 3) : String(row.value);
  return value + (row.unit ? ' ' + row.unit : '');
}

/** A capability source list covers the whole record; it cannot verify an individual field. */
export function configurationSpecifications(robot: Dossier, lang: Lang = 'en') {
  const de = lang === 'de';
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
      label: de ? DE.capability[key] ?? label : label,
      value: key === 'hands' ? (de ? DE.hands : HAND_LABELS)[value as Dossier['capabilities']['hands']] : value,
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
  const missing = gaps.map((field) => researchFieldLabel(field, lang));
  if (robot.capabilities.sdk === null) missing.push(de ? DE.capability.sdk : 'SDK / development interface');
  const summary = [
    { key: 'arm_payload_kg', capability: 'armPayloadKg', label: 'Per arm' },
    { key: 'carry_payload_kg', capability: 'carryPayloadKg', label: 'Body / base payload' },
    { key: 'runtime_h', capability: 'runtimeH', label: 'Runtime' },
    { key: 'ip_rating', capability: 'ipRating', label: 'IP rating' },
  ].flatMap(({ key, capability, label }) => {
    const row = specs.find((item) => item.key === key) ?? capabilities.find((item) => item.key === capability);
    return row && row.value !== null ? [{ ...row, label: de ? DE.summary[key] : label }] : [];
  });
  return { specs, capabilities, missing, summary };
}
