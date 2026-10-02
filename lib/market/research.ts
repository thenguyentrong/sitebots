import type { Dossier } from './schema';

// Filling the capability values a market record still lacks (docs/research/missing-specs.md).
// Researchers return one row per value with the exact words from the page; this module says what
// is missing, reads their CSV and checks that a quote really carries the value. The fetching and
// writing live in scripts/market-specs.ts.

export const FIELDS = {
  arm_payload_kg: { capability: 'armPayloadKg', spec: 'arm_payload_kg', label: 'Payload per arm', unit: 'kg', kind: 'number' },
  both_arms_payload_kg: { capability: null, spec: 'both_arms_payload_kg', label: 'Payload, both arms', unit: 'kg', kind: 'number' },
  carry_payload_kg: { capability: 'carryPayloadKg', spec: 'carry_payload_kg', label: 'Payload', unit: 'kg', kind: 'number' },
  runtime_h: { capability: 'runtimeH', spec: 'runtime_h', label: 'Runtime', unit: 'h', kind: 'number' },
  ip_rating: { capability: 'ipRating', spec: 'ip_rating', label: 'IP rating', unit: null, kind: 'ip' },
  stairs: { capability: 'stairs', spec: null, label: 'Stairs', unit: null, kind: 'bool' },
  rough_ground: { capability: 'roughGround', spec: null, label: 'Rough ground', unit: null, kind: 'bool' },
  outdoor: { capability: 'outdoor', spec: null, label: 'Outdoor use', unit: null, kind: 'bool' },
  hands_included: { capability: 'handsIncluded', spec: null, label: 'Hands included', unit: null, kind: 'bool' },
} as const;

export type Field = keyof typeof FIELDS;
export const SOURCE_KINDS_IN = ['manufacturer', 'seller', 'press', 'database'] as const;

/** The fields a record still lacks, only those that apply to its body: no arm payload for a dog without an arm. */
export function missingFields(record: Pick<Dossier, 'robotType' | 'capabilities' | 'specs'>): Field[] {
  const c = record.capabilities;
  const has = (key: string) => record.specs.some((spec) => spec.key === key);
  const out: Field[] = [];
  if (c.arms > 0 && c.armPayloadKg === null) out.push('arm_payload_kg');
  if (c.arms >= 2 && !has('both_arms_payload_kg')) out.push('both_arms_payload_kg');
  // A carried load means a back or a base; a walking humanoid carries in its hands.
  if ((record.robotType !== 'humanoid' || c.wheels) && c.carryPayloadKg === null) out.push('carry_payload_kg');
  if (c.runtimeH === null) out.push('runtime_h');
  if (c.ipRating === null) out.push('ip_rating');
  if (c.legs && c.stairs === null) out.push('stairs');
  if (c.roughGround === null) out.push('rough_ground');
  if (c.outdoor === null) out.push('outdoor');
  if (c.arms > 0 && c.handsIncluded === null) out.push('hands_included');
  return out;
}

/** RFC 4180 CSV: quoted cells, doubled quotes, commas and line breaks inside quotes, CRLF or LF. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^\ufeff/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((key) => key.trim().toLowerCase());
  return body.map((values) => Object.fromEntries(keys.map((key, index) => [key, (values[index] ?? '').trim()])));
}

export type Value = number | string | boolean;

/** The value as the record stores it, or null when the cell does not fit the field. */
export function parseValue(field: Field, raw: string): Value | null {
  const text = raw.trim();
  switch (FIELDS[field].kind) {
    case 'number': {
      const number = Number(text.replace(',', '.'));
      return Number.isFinite(number) && number > 0 ? number : null;
    }
    case 'ip': return /^IP[0-9X][0-9X]$/i.test(text) ? text.toUpperCase() : null;
    case 'bool': return /^(yes|true)$/i.test(text) ? true : /^(no|false)$/i.test(text) ? false : null;
  }
}

/** Page text and quotes compared without case, accents, spacing or typographic quotes and dashes mattering. */
export function normalizeText(text: string): string {
  return text.normalize('NFKC').toLowerCase()
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'").replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

/** The quote without the English translation a researcher may add in square brackets. */
export const quoteOnPage = (quote: string) => quote.replace(/\s*\[[^\]]*\]\s*$/, '').trim();

/** Whether the page text carries the quote. Spacing is ignored: a page's text runs labels and values
 * together where they sit in separate elements ("arm load /peak: about 21kg"). */
export const pageHasQuote = (pageText: string, quote: string) =>
  normalizeText(pageText).replace(/\s+/g, '').includes(normalizeText(quoteOnPage(quote)).replace(/\s+/g, ''));

/** Whether the quote states the value: the number in any common notation, the IP code, or (for yes/no) nothing to check. */
export function quoteHasValue(field: Field, value: Value, quote: string): boolean {
  const text = normalizeText(quote);
  if (typeof value === 'number') {
    const [whole, fraction] = String(value).split('.');
    const pattern = fraction ? whole + '[.,]' + fraction + '0*' : whole + '(?:[.,]0+)?';
    // Not part of a longer number on either side: 7 is not in 17, 0.7 or 7.5.
    return new RegExp('(^|[^0-9.,])' + pattern + '(?![0-9]|[.,][0-9])').test(text);
  }
  if (typeof value === 'string') return text.includes(value.toLowerCase());
  return true;
}
