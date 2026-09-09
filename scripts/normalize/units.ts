// Unit normalisation. Sources mix mm, cm, inches, feet-and-inches, pounds,
// km/h, mph, minutes and hours — sometimes inside one table (1X publishes
// 5'6", 66 lbs and 6.2 m/s on the same page). Everything is converted into the
// field's canonical unit at ingest, and the raw string is kept on the fact so
// a wrong conversion can be found later.

import { fieldDef, type FieldDef, type UnitFamily } from '@/lib/spec/fields';

export type Quantity = {
  value?: number;
  min?: number;
  max?: number;
  unit?: string;
  raw: string;
};

const NUM = String.raw`-?\d+(?:[.,]\d+)?`;
const UNIT = String.raw`[a-zA-Z°℃℉µ"'%]+(?:/[a-zA-Z]+)?`;

const SEP = String.raw`(?:-|–|—|~|to|…|\.\.\.|bis)`;
const HEDGE = String.raw`(?:~|≈|≥|≤|>|<|about|approx\.?|approximately|ca\.?|up to|max\.?|min\.?|over|around)?`;

const RANGE_RE = new RegExp(`^${HEDGE}\\s*(${NUM})\\s*(${UNIT})?\\s*${SEP}\\s*(${NUM})\\s*(${UNIT})?$`, 'i');
const SINGLE_RE = new RegExp(`^${HEDGE}\\s*(${NUM})\\s*(${UNIT})?$`, 'i');
const OPEN_RE = new RegExp(`^${HEDGE}\\s*(${NUM})\\s*(${UNIT})?\\s*\\+$`, 'i'); // "40+"
const FEET_RE = /^(\d+)\s*(?:'|ft\.?|feet)\s*(\d+(?:\.\d+)?)?\s*(?:"|in\.?|inches)?$/i;
// "8 per arm", "6–7 per hand": the number is the value, the phrase a note.
const PER_RE = /\s*\b(per\s+(?:hand|arm|leg|side)|each)\b\.?\s*$/i;

function toNumber(s: string): number {
  // "1,320" was already de-thousanded; a remaining comma is a decimal comma.
  return Number(s.replace(',', '.'));
}

function clean(raw: string): string {
  return raw
    .replace(/−/g, '-') // unicode minus
    .replace(/[’′]/g, "'") // curly feet mark
    .replace(/[”″]/g, '"') // curly inch mark
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/ /g, ' ')
    .replace(/,(?=\d{3}\b)/g, '') // thousands separator
    .replace(/℃/g, '°C')
    .replace(/℉/g, '°F')
    .replace(PER_RE, '')
    // "300 kg kg", "160 to 175 cm cm": a unit the source wrote plus one an adapter appended.
    .replace(/\b([a-zA-Z°/]+)\s+\1$/i, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse "1270–1320 mm", "66 lbs", "5'6\"", "-20 to 55 °C", "about 2 h". */
export function parseQuantity(raw: string): Quantity | null {
  const s = clean(raw);
  if (!s) return null;

  const ft = FEET_RE.exec(s);
  if (ft) {
    const value = Number(ft[1]) * 0.3048 + (ft[2] ? Number(ft[2]) * 0.0254 : 0);
    return { value: Math.round(value * 1000) / 1000, unit: 'm', raw };
  }

  const r = RANGE_RE.exec(s);
  if (r) {
    const unit = r[4] ?? r[2];
    return { min: toNumber(r[1]), max: toNumber(r[3]), unit: unit?.trim(), raw };
  }

  const o = OPEN_RE.exec(s);
  if (o) {
    return { min: toNumber(o[1]), unit: o[2]?.trim(), raw };
  }

  const m = SINGLE_RE.exec(s);
  if (m) {
    return { value: toNumber(m[1]), unit: m[2]?.trim(), raw };
  }
  return null;
}

type Conv = { family: UnitFamily; to: (v: number) => number; canonical: string };

const UNITS: Record<string, Conv> = {
  // length → m
  mm: { family: 'length', to: (v) => v / 1000, canonical: 'm' },
  cm: { family: 'length', to: (v) => v / 100, canonical: 'm' },
  m: { family: 'length', to: (v) => v, canonical: 'm' },
  km: { family: 'length', to: (v) => v * 1000, canonical: 'm' },
  in: { family: 'length', to: (v) => v * 0.0254, canonical: 'm' },
  inch: { family: 'length', to: (v) => v * 0.0254, canonical: 'm' },
  inches: { family: 'length', to: (v) => v * 0.0254, canonical: 'm' },
  '"': { family: 'length', to: (v) => v * 0.0254, canonical: 'm' },
  ft: { family: 'length', to: (v) => v * 0.3048, canonical: 'm' },
  feet: { family: 'length', to: (v) => v * 0.3048, canonical: 'm' },
  "'": { family: 'length', to: (v) => v * 0.3048, canonical: 'm' },
  // mass → kg
  g: { family: 'mass', to: (v) => v / 1000, canonical: 'kg' },
  kg: { family: 'mass', to: (v) => v, canonical: 'kg' },
  kgs: { family: 'mass', to: (v) => v, canonical: 'kg' },
  t: { family: 'mass', to: (v) => v * 1000, canonical: 'kg' },
  lb: { family: 'mass', to: (v) => v * 0.45359237, canonical: 'kg' },
  lbs: { family: 'mass', to: (v) => v * 0.45359237, canonical: 'kg' },
  pound: { family: 'mass', to: (v) => v * 0.45359237, canonical: 'kg' },
  pounds: { family: 'mass', to: (v) => v * 0.45359237, canonical: 'kg' },
  // speed → m/s
  'm/s': { family: 'speed', to: (v) => v, canonical: 'm/s' },
  'km/h': { family: 'speed', to: (v) => v / 3.6, canonical: 'm/s' },
  kmh: { family: 'speed', to: (v) => v / 3.6, canonical: 'm/s' },
  kph: { family: 'speed', to: (v) => v / 3.6, canonical: 'm/s' },
  mph: { family: 'speed', to: (v) => v * 0.44704, canonical: 'm/s' },
  // time → h
  s: { family: 'time', to: (v) => v / 3600, canonical: 'h' },
  sec: { family: 'time', to: (v) => v / 3600, canonical: 'h' },
  min: { family: 'time', to: (v) => v / 60, canonical: 'h' },
  mins: { family: 'time', to: (v) => v / 60, canonical: 'h' },
  minute: { family: 'time', to: (v) => v / 60, canonical: 'h' },
  minutes: { family: 'time', to: (v) => v / 60, canonical: 'h' },
  h: { family: 'time', to: (v) => v, canonical: 'h' },
  hr: { family: 'time', to: (v) => v, canonical: 'h' },
  hrs: { family: 'time', to: (v) => v, canonical: 'h' },
  hour: { family: 'time', to: (v) => v, canonical: 'h' },
  hours: { family: 'time', to: (v) => v, canonical: 'h' },
  // energy → Wh
  wh: { family: 'energy', to: (v) => v, canonical: 'Wh' },
  kwh: { family: 'energy', to: (v) => v * 1000, canonical: 'Wh' },
  // temperature → °C
  '°c': { family: 'temperature', to: (v) => v, canonical: '°C' },
  c: { family: 'temperature', to: (v) => v, canonical: '°C' },
  '°f': { family: 'temperature', to: (v) => ((v - 32) * 5) / 9, canonical: '°C' },
  f: { family: 'temperature', to: (v) => ((v - 32) * 5) / 9, canonical: '°C' },
  k: { family: 'temperature', to: (v) => v - 273.15, canonical: '°C' },
  // angle → °
  '°': { family: 'angle', to: (v) => v, canonical: '°' },
  deg: { family: 'angle', to: (v) => v, canonical: '°' },
  degrees: { family: 'angle', to: (v) => v, canonical: '°' },
};

// Same key, different family: "min" is minutes for a runtime and nothing for a
// slope, "m" is metres and "min" starts with it. Resolve by the field's family
// first, then fall back to the table.
function conv(unit: string | undefined, family: UnitFamily | undefined): Conv | null {
  if (!unit) return null;
  const key = unit.toLowerCase().replace(/\.$/, '');
  const c = UNITS[key];
  if (!c) return null;
  if (family && family !== 'none' && family !== 'count' && c.family !== family) {
    // "C" as Celsius only makes sense for temperature; "s" for time. A mismatch
    // is almost always a label we should not have parsed as a unit.
    return null;
  }
  return c;
}

export type Canonical = { value?: number; min?: number; max?: number; unit?: string };

function round(v: number, decimals: number): number {
  const p = 10 ** decimals;
  return Math.round(v * p) / p;
}

/**
 * Convert a parsed quantity into the field's canonical unit. Returns null when
 * the unit family does not fit the field (a length where a mass was expected),
 * which the caller treats as a parse failure rather than a value.
 */
export function toCanonical(field: FieldDef, q: Quantity): Canonical | null {
  const family = field.family;
  const decimals = (field.decimals ?? 2) + 2;

  if (!family || family === 'none' || family === 'count') {
    // Unit-less or fixed-unit field (TOPS, dB, months): take the number as is.
    return pick(q, (v) => v, field.unit, decimals);
  }

  const c = conv(q.unit, family);
  if (!c) {
    // No unit given: accept only when the field's own unit is unambiguous and
    // the magnitude is plausible; otherwise refuse rather than guess.
    if (!q.unit && field.unit) return pick(q, (v) => v, field.unit, decimals);
    return null;
  }
  return pick(q, c.to, c.canonical, decimals);
}

function pick(q: Quantity, to: (v: number) => number, unit: string | undefined, decimals: number): Canonical {
  const out: Canonical = { unit };
  if (q.value !== undefined) out.value = round(to(q.value), decimals);
  if (q.min !== undefined) out.min = round(to(q.min), decimals);
  if (q.max !== undefined) out.max = round(to(q.max), decimals);
  if (out.min !== undefined && out.max !== undefined && out.min > out.max) [out.min, out.max] = [out.max, out.min];
  return out;
}

/** Convenience: raw string → canonical numbers for a field id. */
export function normalizeQuantity(fieldId: string, raw: string): Canonical | null {
  const def = fieldDef(fieldId);
  if (!def) return null;
  const q = parseQuantity(raw);
  if (!q) return null;
  return toCanonical(def, q);
}

// Known units only, longest first, so "4-6hWalking" yields the hour and not
// a made-up unit "hwalking", and "2070 FP4 TFLOPS" yields a bare 2070.
const KNOWN_UNIT = String.raw`(?:km/h|m/s|kmh|kph|mph|kwh|wh|mm|cm|km|kgs|kg|lbs|lb|pounds?|mins?|minutes?|hours?|hrs?|sec|tflops|tops|degrees|deg|°c|°f|°|db|g|m|t|h|s)(?![a-z/])`;
const LOOSE_RE = new RegExp(`(${NUM})\\s*(?:${SEP}\\s*(${NUM}))?\\s*(${KNOWN_UNIT})?`, 'gi');

/**
 * Pull the first quantity out of prose: "≈ 60kg Total weight (battery
 * included)" → 60 kg; "0 ~ 2.5m/s" → 2.5 m/s (a range starting at zero is a
 * maximum, not a range). For manufacturer pages whose cells mix a number with
 * a remark. `unitHint` names the family the field expects, so a stray
 * dimensionless number ("(battery included)") is not taken for the value.
 */
export function extractQuantity(raw: string, unitHint?: string): Quantity | null {
  const s = clean(raw).replace(/^\s*(≈|~|about|approx\.?)\s*/i, '');
  const direct = parseQuantity(s);
  if (direct) return normalizeZeroRange({ ...direct, unit: direct.unit ? unitSpelling(direct.unit) : direct.unit });
  LOOSE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LOOSE_RE.exec(s))) {
    const unit = m[3] ? unitSpelling(m[3].trim()) : undefined;
    if (unitHint && !unit) continue;
    if (unitHint && unit && conv(unit, undefined)?.canonical !== conv(unitHint, undefined)?.canonical) continue;
    const q: Quantity = m[2] ? { min: toNumber(m[1]), max: toNumber(m[2]), unit, raw } : { value: toNumber(m[1]), unit, raw };
    return normalizeZeroRange(q);
  }
  return null;
}

/** "Kg" → "kg", "WH" → "Wh", "°c" → "°C": one spelling per unit so facts compare. */
export function unitSpelling(unit: string): string {
  const k = unit.toLowerCase();
  const special: Record<string, string> = {
    wh: 'Wh', kwh: 'kWh', '°c': '°C', '°f': '°F', db: 'dB', tops: 'TOPS', tflops: 'TFLOPS',
    mins: 'min', minute: 'min', minutes: 'min', hours: 'h', hour: 'h', hrs: 'h', hr: 'h',
    lbs: 'lb', pounds: 'lb', pound: 'lb', kgs: 'kg', degrees: '°', deg: '°',
  };
  return special[k] ?? k;
}

function normalizeZeroRange(q: Quantity): Quantity {
  if (q.min === 0 && q.max !== undefined) return { value: q.max, unit: q.unit, raw: q.raw };
  return q;
}

/** "IP54", "ip 67", "IP6X" → "IP54" | "IP67" | "IP6X"; anything else null. */
export function normalizeIp(raw: string): string | null {
  const m = /ip\s*([0-6x])\s*([0-9x])/i.exec(raw);
  return m ? `IP${m[1].toUpperCase()}${m[2].toUpperCase()}` : null;
}

const TRUE_WORDS = /^(yes|true|y|ja|✓|✔|supported|available|1)$/i;
const FALSE_WORDS = /^(no|false|n|nein|✗|✘|x|—|-|not supported|unavailable|0)$/i;

export function normalizeBool(raw: string | boolean): boolean | null {
  if (typeof raw === 'boolean') return raw;
  const s = raw.trim();
  if (TRUE_WORDS.test(s)) return true;
  if (FALSE_WORDS.test(s)) return false;
  return null;
}
