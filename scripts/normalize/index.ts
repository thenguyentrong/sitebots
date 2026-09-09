import { sourceForUrl } from '@/lib/ingest/sources';
import { fieldDef } from '@/lib/spec/fields';
import { PART_SCHEMAS, parseHandType } from '@/lib/spec/parts';
import type { NormalizedAvailability, NormalizedFact, NormalizedPrice } from '@/lib/spec/types';
import type { RawField, RawRecord } from '../scrape/_lib/types';
import { resolveSubject, type ResolvedSubject } from './entity';
import { normalizeBool, normalizeIp, normalizeQuantity, parseQuantity, toCanonical } from './units';

export type NormalizedRecord = {
  raw: RawRecord;
  subject: ResolvedSubject | null;
  facts: NormalizedFact[];
  prices: NormalizedPrice[];
  availability: NormalizedAvailability[];
  warnings: string[];
};

const DEFAULT_CONFIDENCE: Record<number, number> = { 0: 0.9, 1: 0.8, 2: 0.6, 3: 0.5, 4: 0.3 };

/**
 * RawField → NormalizedFact, or null with a reason. Unit conversion is done
 * here; the raw value and unit travel along so a bad conversion can be traced.
 */
export function normalizeField(
  f: RawField,
  base: Pick<NormalizedFact, 'source_id' | 'source_url' | 'source_tier' | 'observed_at' | 'run_id' | 'snapshot_id'>,
): { fact: NormalizedFact | null; warning?: string } {
  const def = fieldDef(f.field);
  if (!def) return { fact: null, warning: `unknown field "${f.field}"` };
  if (def.qualifiers && f.qualifier && !def.qualifiers.includes(f.qualifier)) {
    return { fact: null, warning: `${f.field}: qualifier "${f.qualifier}" not allowed` };
  }

  const fact: NormalizedFact = {
    field: f.field,
    qualifier: f.qualifier ?? null,
    unit: def.unit ?? null,
    raw_value: typeof f.value === 'string' ? f.value : f.value == null ? null : JSON.stringify(f.value),
    raw_unit: f.unit ?? null,
    evidence_url: f.evidence_url ?? null,
    confidence: f.confidence ?? DEFAULT_CONFIDENCE[base.source_tier] ?? 0.5,
    note: f.note ?? null,
    ...base,
  };

  switch (def.kind) {
    case 'number':
    case 'range': {
      if (f.min !== undefined || f.max !== undefined) {
        const c = toCanonical(def, { min: f.min, max: f.max, unit: f.unit, raw: `${f.min ?? ''}–${f.max ?? ''} ${f.unit ?? ''}` });
        if (!c) return { fact: null, warning: `${f.field}: cannot convert ${f.unit}` };
        fact.value_min = c.min ?? null;
        fact.value_max = c.max ?? null;
        fact.raw_value = `${f.min ?? ''}–${f.max ?? ''} ${f.unit ?? def.unit ?? ''}`.trim();
        return { fact };
      }
      if (typeof f.value === 'number') {
        const c = toCanonical(def, { value: f.value, unit: f.unit, raw: String(f.value) });
        if (!c) return { fact: null, warning: `${f.field}: cannot convert ${f.unit}` };
        fact.value_num = c.value ?? null;
        return { fact };
      }
      if (typeof f.value === 'string') {
        const q = parseQuantity(f.value);
        if (!q) return { fact: null, warning: `${f.field}: cannot parse "${f.value}"` };
        if (f.unit && !q.unit) q.unit = f.unit;
        const c = toCanonical(def, q);
        if (!c) return { fact: null, warning: `${f.field}: cannot convert "${f.value}"` };
        fact.value_num = c.value ?? null;
        fact.value_min = c.min ?? null;
        fact.value_max = c.max ?? null;
        return { fact };
      }
      return { fact: null, warning: `${f.field}: no value` };
    }
    case 'bool': {
      const b = typeof f.value === 'boolean' || typeof f.value === 'string' ? normalizeBool(f.value) : null;
      if (b === null) return { fact: null, warning: `${f.field}: not a yes/no` };
      fact.value_bool = b;
      return { fact };
    }
    case 'text': {
      if (typeof f.value !== 'string' || !f.value.trim()) return { fact: null, warning: `${f.field}: empty` };
      let v: string | null = f.field === 'ip_rating' ? normalizeIp(f.value) : f.value.trim();
      if (!v) return { fact: null, warning: `${f.field}: "${f.value}" is not an IP code` };
      if (def.values && !def.values.includes(v)) {
        // A closed vocabulary: map the maker's wording onto it, or drop the fact rather than store free text.
        v = f.field === 'hand_type' ? parseHandType(v) : null;
        if (!v) return { fact: null, warning: `${f.field}: "${f.value}" is not one of ${def.values.join('/')}` };
      }
      fact.value_text = v;
      return { fact };
    }
    case 'list': {
      const arr = Array.isArray(f.value) ? f.value : typeof f.value === 'string' ? f.value.split(/[,;]/) : null;
      if (!arr) return { fact: null, warning: `${f.field}: not a list` };
      fact.value_json = arr.map((s) => String(s).trim()).filter(Boolean);
      return { fact };
    }
    case 'json': {
      if (f.value == null) return { fact: null, warning: `${f.field}: empty` };
      const shape = PART_SCHEMAS[f.field];
      if (shape) {
        const res = shape.safeParse(f.value);
        if (!res.success) return { fact: null, warning: `${f.field}: ${res.error.issues[0]?.path.join('.') ?? ''} ${res.error.issues[0]?.message ?? 'invalid'}` };
        fact.value_json = res.data;
        return { fact };
      }
      fact.value_json = f.value;
      return { fact };
    }
  }
}

export function normalizeRecord(raw: RawRecord, run?: { run_id?: string | null; snapshot_id?: number | null }): NormalizedRecord {
  const warnings: string[] = [];
  const subject = resolveSubject(raw.subject);
  const source = sourceForUrl(raw.source_url);
  const base = {
    source_id: source?.id ?? raw.source_id ?? null,
    source_url: raw.source_url,
    source_tier: source?.tier ?? 3,
    observed_at: raw.observed_at,
    run_id: run?.run_id ?? null,
    snapshot_id: run?.snapshot_id ?? null,
  };

  const facts: NormalizedFact[] = [];
  for (const f of raw.fields) {
    const { fact, warning } = normalizeField(f, base);
    if (fact) facts.push(fact);
    if (warning) warnings.push(warning);
  }

  const prices: NormalizedPrice[] = raw.prices.map((p) => ({
    amount: p.amount,
    currency: p.currency.toUpperCase(),
    region: p.region,
    tier: p.tier,
    direct: p.direct,
    config: p.config ?? 'base',
    includes_vat: p.includes_vat ?? null,
    sku: p.sku ?? null,
    source_id: base.source_id,
    source_url: raw.source_url,
    evidence_url: p.evidence_url ?? null,
    observed_at: raw.observed_at,
    note: p.note ?? null,
    run_id: base.run_id,
    snapshot_id: base.snapshot_id,
  }));

  const availability: NormalizedAvailability[] = raw.availability.map((a) => ({
    region: a.region,
    status: a.status,
    in_stock: a.in_stock ?? null,
    lead_time_days_min: a.lead_time_days_min ?? null,
    lead_time_days_max: a.lead_time_days_max ?? null,
    lead_time_text: a.lead_time_text ?? null,
    source_id: base.source_id,
    source_url: raw.source_url,
    observed_at: raw.observed_at,
    run_id: base.run_id,
  }));

  return { raw, subject, facts, prices, availability, warnings };
}

export { normalizeQuantity };
