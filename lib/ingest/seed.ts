import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { SqlClient } from '@/lib/db';
import { AVAILABILITY_STATUS, FORM_FACTORS, REGIONS, ROBOT_STATUS } from '@/lib/spec/enums';
import { fieldDef } from '@/lib/spec/fields';
import { PART_SCHEMAS } from '@/lib/spec/parts';
import type { NormalizedAvailability, NormalizedFact, NormalizedPrice } from '@/lib/spec/types';
import { buildCurrent } from './current';
import { ensureRobot } from './entities';
import { insertAvailability, insertPrices, upsertFacts } from './facts';
import { sourceForUrl, upsertSources } from './sources';

/**
 * data/seed/robots.json: robots entered by hand from manufacturer pages, with
 * the URL each value was read from. Values are already in canonical units.
 * The seed is what a fresh clone shows before any scraper has run, and the
 * regression baseline for the merge step.
 */

const SeedFact = z.object({
  field: z.string(),
  qualifier: z.string().optional(),
  value: z.union([z.number(), z.string(), z.boolean(), z.array(z.string()), z.record(z.string(), z.unknown())]).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().optional(),
  raw: z.string().optional(),
  source_url: z.url(),
  evidence_url: z.url().optional(),
  confidence: z.number().min(0).max(1).optional(),
  note: z.string().optional(),
});

const SeedPrice = z.object({
  amount: z.number(),
  currency: z.string().length(3),
  region: z.enum(REGIONS),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  direct: z.boolean().default(false),
  config: z.string().default('base'),
  includes_vat: z.boolean().optional(),
  source_url: z.url(),
  note: z.string().optional(),
});

const SeedAvailability = z.object({
  region: z.enum(REGIONS),
  status: z.enum(AVAILABILITY_STATUS),
  in_stock: z.boolean().optional(),
  lead_time_days_min: z.number().optional(),
  lead_time_days_max: z.number().optional(),
  lead_time_text: z.string().optional(),
  source_url: z.url(),
});

const SeedRobot = z.object({
  manufacturer: z.string(),
  model: z.string(),
  variant: z.string().default('base'),
  name: z.string().optional(),
  form_factor: z.enum(FORM_FACTORS).optional(),
  status: z.enum(ROBOT_STATUS).default('unknown'),
  release_year: z.number().int().optional(),
  summary: z.string().optional(),
  observed_at: z.string(),
  facts: z.array(SeedFact).default([]),
  prices: z.array(SeedPrice).default([]),
  availability: z.array(SeedAvailability).default([]),
});

export const SeedFile = z.object({ robots: z.array(SeedRobot) });
export type SeedFile = z.infer<typeof SeedFile>;

export function loadSeed(root = process.cwd()): SeedFile {
  const text = readFileSync(join(root, 'data', 'seed', 'robots.json'), 'utf8');
  return SeedFile.parse(JSON.parse(text));
}

function factFromSeed(f: z.infer<typeof SeedFact>, observedAt: string): NormalizedFact {
  const def = fieldDef(f.field);
  if (!def) throw new Error(`seed: unknown field ${f.field}`);
  if (def.qualifiers && f.qualifier && !def.qualifiers.includes(f.qualifier)) {
    throw new Error(`seed: ${f.field} qualifier ${f.qualifier} not allowed`);
  }
  const src = sourceForUrl(f.source_url);
  const fact: NormalizedFact = {
    field: f.field,
    qualifier: f.qualifier ?? null,
    unit: f.unit ?? def.unit ?? null,
    raw_value: f.raw ?? null,
    source_id: src?.id ?? 'seed',
    source_url: f.source_url,
    evidence_url: f.evidence_url ?? null,
    source_tier: src?.tier ?? 1,
    observed_at: observedAt,
    confidence: f.confidence ?? 0.8,
    note: f.note ?? null,
  };
  if (f.min !== undefined || f.max !== undefined) {
    fact.value_min = f.min ?? null;
    fact.value_max = f.max ?? null;
  } else if (typeof f.value === 'number') fact.value_num = f.value;
  else if (typeof f.value === 'boolean') fact.value_bool = f.value;
  else if (typeof f.value === 'string') fact.value_text = f.value;
  else if (f.value !== undefined) {
    const shape = PART_SCHEMAS[f.field];
    if (shape) {
      const res = shape.safeParse(f.value);
      if (!res.success) throw new Error(`seed: ${f.field} ${res.error.issues[0]?.path.join('.')} ${res.error.issues[0]?.message}`);
    }
    fact.value_json = f.value;
  }
  return fact;
}

export async function seedDatabase(sql: SqlClient, seed = loadSeed()): Promise<{ robots: number; facts: number }> {
  await upsertSources(sql);
  let facts = 0;
  const ids: string[] = [];
  for (const r of seed.robots) {
    const id = await ensureRobot(sql, {
      manufacturerSlug: r.manufacturer,
      modelSlug: r.model,
      variant: r.variant,
      name: r.name,
      formFactor: r.form_factor,
      status: r.status,
      releaseYear: r.release_year ?? null,
      summary: r.summary ?? null,
    });
    ids.push(id);
    facts += await upsertFacts(sql, id, r.facts.map((f) => factFromSeed(f, r.observed_at)));
    const prices: NormalizedPrice[] = r.prices.map((p) => ({
      ...p,
      includes_vat: p.includes_vat ?? null,
      source_id: sourceForUrl(p.source_url)?.id ?? 'seed',
      observed_at: r.observed_at,
      note: p.note ?? null,
    }));
    await insertPrices(sql, id, prices);
    const availability: NormalizedAvailability[] = r.availability.map((a) => ({
      ...a,
      in_stock: a.in_stock ?? null,
      lead_time_days_min: a.lead_time_days_min ?? null,
      lead_time_days_max: a.lead_time_days_max ?? null,
      lead_time_text: a.lead_time_text ?? null,
      source_id: sourceForUrl(a.source_url)?.id ?? 'seed',
      observed_at: r.observed_at,
    }));
    await insertAvailability(sql, id, availability);
  }
  await buildCurrent(sql, ids);
  return { robots: ids.length, facts };
}
