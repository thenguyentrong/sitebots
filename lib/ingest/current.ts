import type { SqlClient } from '@/lib/db';
import { fieldDef, specKey } from '@/lib/spec/fields';
import type { ScalarValue, SpecConflict, SpecValue, Specs } from '@/lib/spec/types';
import type { Trust } from '@/lib/spec/enums';

/**
 * Rebuild the typed projection for a set of robots from the fact ledger.
 *
 * Precedence within a field: lowest source tier first (curated, manufacturer,
 * distributor, aggregator, estimate), then the most recent observation, then
 * confidence. The trust label is not the winner's tier alone — a value is
 * `verified` when a manufacturer-domain source states it, `assessed` when we
 * curated it with evidence but no manufacturer source exists, `reported` when
 * only third parties say so. Numeric disagreement above ten per cent among the
 * sources of one field is recorded in `conflicts` and shown on the page rather
 * than silently averaged.
 *
 * Done in TypeScript rather than a SQL view so it is unit-testable once and
 * behaves identically on PGlite and Neon.
 */

type FactRow = {
  field: string;
  qualifier: string | null;
  value_num: string | number | null;
  value_min: string | number | null;
  value_max: string | number | null;
  value_text: string | null;
  value_bool: boolean | null;
  value_json: unknown;
  unit: string | null;
  raw_value: string | null;
  source_id: string | null;
  source_url: string;
  evidence_url: string | null;
  source_tier: number;
  observed_at: string | Date;
  confidence: number;
  note: string | null;
};

const CORE_FIELDS = [
  'height_m',
  'weight_kg',
  'payload_kg',
  'walk_speed_ms',
  'runtime_h',
  'battery_wh',
  'dof_total',
  'ip_rating',
  'operating_temp_c',
  'stair_capable',
  'outdoor_rated',
  'certifications',
  'task_capabilities',
];

function toNum(v: string | number | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function iso(d: string | Date): string {
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function factValue(f: FactRow): ScalarValue {
  if (f.value_bool !== null && f.value_bool !== undefined) return f.value_bool;
  const n = toNum(f.value_num);
  if (n !== null) return n;
  if (f.value_json !== null && f.value_json !== undefined) return f.value_json as ScalarValue;
  if (f.value_text !== null && f.value_text !== undefined) return f.value_text;
  const min = toNum(f.value_min);
  const max = toNum(f.value_max);
  if (min !== null && max !== null) return (min + max) / 2;
  return min ?? max ?? null;
}

function numericFor(f: FactRow): number | null {
  const v = factValue(f);
  return typeof v === 'number' ? v : null;
}

function trustFor(winner: FactRow, group: FactRow[]): Trust {
  const manufacturerAgrees = group.some((g) => g.source_tier === 1 && agrees(winner, g));
  if (winner.source_tier === 1 || manufacturerAgrees) return 'verified';
  if (winner.source_tier === 0) return 'assessed';
  return 'reported';
}

function agrees(a: FactRow, b: FactRow): boolean {
  const na = numericFor(a);
  const nb = numericFor(b);
  if (na !== null && nb !== null) {
    if (na === 0 && nb === 0) return true;
    return Math.abs(na - nb) / Math.max(Math.abs(na), Math.abs(nb)) <= 0.1;
  }
  return JSON.stringify(factValue(a)) === JSON.stringify(factValue(b));
}

export function projectSpecs(rows: FactRow[]): { specs: Specs; conflicts: SpecConflict[] } {
  const groups = new Map<string, FactRow[]>();
  // Old values remain in the ledger; only the latest observation from a URL describes its current claim.
  const latest = new Map<string, number>();
  const sourceKey = (r: FactRow) => JSON.stringify([r.field, r.qualifier, r.source_url]);
  for (const r of rows) latest.set(sourceKey(r), Math.max(latest.get(sourceKey(r)) ?? -Infinity, new Date(r.observed_at).getTime()));
  for (const r of rows) {
    if (new Date(r.observed_at).getTime() < latest.get(sourceKey(r))!) continue;
    const key = specKey(r.field, r.qualifier);
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }

  const specs: Specs = {};
  const conflicts: SpecConflict[] = [];

  for (const [key, group] of groups) {
    group.sort(
      (a, b) =>
        a.source_tier - b.source_tier ||
        new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime() ||
        b.confidence - a.confidence,
    );
    const w = group[0];
    const def = fieldDef(r0(group).field);
    const spec: SpecValue = {
      value: factValue(w),
      min: toNum(w.value_min),
      max: toNum(w.value_max),
      unit: w.unit,
      raw: w.raw_value,
      source_id: w.source_id,
      source_url: w.source_url,
      evidence_url: w.evidence_url,
      source_tier: w.source_tier,
      observed_at: iso(w.observed_at),
      confidence: Number(w.confidence),
      trust: trustFor(w, group),
      note: w.note,
    };
    // Structured lists: union across sources rather than crown one winner, and
    // never call the difference a conflict — two catalogues listing different
    // accessories are both right.
    if (def?.kind === 'json') {
      if (def.merge === 'union') spec.value = unionItems(group);
      specs[key] = spec;
      continue;
    }
    specs[key] = spec;

    const disagreeing = group.filter((g) => g !== w && !agrees(w, g));
    if (disagreeing.length) {
      conflicts.push({
        key,
        values: [w, ...disagreeing].map((g) => ({
          value: factValue(g),
          source_url: g.source_url,
          source_tier: g.source_tier,
          observed_at: iso(g.observed_at),
        })),
      });
    }
  }
  return { specs, conflicts };
}

function r0(group: FactRow[]): FactRow {
  return group[0];
}

/** Winner's items first, then every other source's, deduped on type + name; foreign items keep their source. */
function unionItems(group: FactRow[]): ScalarValue {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const f of group) {
    const v = factValue(f);
    if (!Array.isArray(v)) continue;
    for (const item of v as unknown[]) {
      if (!item || typeof item !== 'object') continue;
      const it = item as Record<string, unknown>;
      const k = `${String(it.type ?? it.group ?? '')}|${String(it.name ?? it.model ?? '').toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(f === group[0] ? it : { ...it, source_url: it.source_url ?? f.source_url });
    }
  }
  return out as unknown as ScalarValue;
}

function num(specs: Specs, key: string): number | null {
  const s = specs[key];
  if (!s) return null;
  if (typeof s.value === 'number') return s.value;
  return null;
}

/** The low end of a published range, for anything the matcher must not overstate. */
function low(specs: Specs, key: string): number | null {
  const s = specs[key];
  if (!s) return null;
  if (s.min != null) return s.min;
  return typeof s.value === 'number' ? s.value : null;
}

/** Counts are integers in the projection; a "23–43 DOF" range projects as 23, not 33. */
function count(specs: Specs, key: string): number | null {
  const v = low(specs, key);
  return v === null ? null : Math.round(v);
}

function bool(specs: Specs, key: string): boolean | null {
  const s = specs[key];
  return s && typeof s.value === 'boolean' ? s.value : null;
}

function text(specs: Specs, key: string): string | null {
  const s = specs[key];
  return s && typeof s.value === 'string' ? s.value : null;
}

function list(specs: Specs, key: string): string[] {
  const s = specs[key];
  return s && Array.isArray(s.value) ? s.value.map(String) : [];
}

export function parseIp(rating: string | null): { solid: number | null; liquid: number | null } {
  const m = rating && /IP\s*([0-6X])([0-9X])/i.exec(rating);
  if (!m) return { solid: null, liquid: null };
  return {
    solid: m[1].toUpperCase() === 'X' ? null : Number(m[1]),
    liquid: m[2].toUpperCase() === 'X' ? null : Number(m[2]),
  };
}

/** The conservative payload the matcher compares against. */
export function conservativePayload(specs: Specs): { rated: number | null; peak: number | null; conservative: number | null } {
  const rated = low(specs, 'payload_kg:rated');
  const peak = num(specs, 'payload_kg:peak');
  const candidates = [
    rated,
    low(specs, 'payload_kg:sustained'),
    low(specs, 'payload_kg:carry_walking'),
    low(specs, 'payload_kg:rated_dual'),
  ].filter((v): v is number => v !== null);
  let conservative: number | null = candidates.length ? Math.min(...candidates) : null;
  if (conservative === null) {
    const p = peak ?? num(specs, 'payload_kg:peak_dual') ?? num(specs, 'payload_kg:instant') ?? low(specs, 'payload_kg');
    if (p !== null) conservative = Math.round(p * 0.5 * 10) / 10;
  }
  return { rated, peak, conservative };
}

/** Runtime for a shift is the lowest published figure; the basis says what it was measured doing. */
export function conservativeRuntime(specs: Specs): { hours: number | null; basis: string | null } {
  const order = ['loaded', 'walking', 'unstated', 'idle'];
  let best: { hours: number; basis: string } | null = null;
  for (const q of order) {
    const v = low(specs, `runtime_h:${q}`);
    if (v !== null && (best === null || v < best.hours)) best = { hours: v, basis: q };
  }
  const plain = low(specs, 'runtime_h');
  if (plain !== null && (best === null || plain < best.hours)) best = { hours: plain, basis: 'unstated' };
  return best ?? { hours: null, basis: null };
}

export async function buildCurrent(sql: SqlClient, robotIds?: string[], runId?: string | null): Promise<number> {
  const ids =
    robotIds ??
    ((await sql`select id from robots order by created_at`) as { id: string }[]).map((r) => r.id);

  for (const id of ids) {
    const rows = (await sql`
      select field, qualifier, value_num, value_min, value_max, value_text, value_bool, value_json, unit,
             raw_value, source_id, source_url, evidence_url, source_tier, observed_at, confidence, note
      from robot_facts where robot_id = ${id}`) as FactRow[];

    const { specs, conflicts } = projectSpecs(rows);
    const payload = conservativePayload(specs);
    const runtime = conservativeRuntime(specs);
    const ip = parseIp(text(specs, 'ip_rating'));
    const height = specs['height_m'];
    const temp = specs['operating_temp_c'];
    const verified = Object.entries(specs)
      .filter(([, s]) => s.trust === 'verified')
      .map(([k]) => k);
    const present = CORE_FIELDS.filter((f) => Object.keys(specs).some((k) => k === f || k.startsWith(f + ':')));
    const completeness = Math.round((present.length / CORE_FIELDS.length) * 100) / 100;

    const certifications = JSON.stringify(list(specs, 'certifications'));
    const tasks = JSON.stringify(list(specs, 'task_capabilities'));

    await sql`
      insert into robot_current (
        robot_id, height_m, height_min_m, height_max_m, weight_kg,
        payload_kg_conservative, payload_kg_rated, payload_kg_peak, reach_m,
        dof_total, dof_body, dof_arms, dof_legs, dof_hands,
        walk_speed_ms, max_speed_ms, battery_wh, runtime_h, runtime_basis, hot_swap, charge_time_h,
        compute_module, compute_tops, ip_rating, ip_solid, ip_liquid, temp_min_c, temp_max_c,
        stair_capable, max_slope_deg, step_height_m, outdoor_rated, noise_db,
        certifications, task_capabilities, requires_operator, trl,
        specs, conflicts, verified_fields, completeness, built_at, built_from_run)
      values (
        ${id}, ${num(specs, 'height_m')}, ${height?.min ?? null}, ${height?.max ?? null}, ${num(specs, 'weight_kg')},
        ${payload.conservative}, ${payload.rated}, ${payload.peak}, ${num(specs, 'reach_m')},
        ${count(specs, 'dof_total')}, ${count(specs, 'dof_body')}, ${count(specs, 'dof_arms')}, ${count(specs, 'dof_legs')}, ${count(specs, 'dof_hands')},
        ${num(specs, 'walk_speed_ms')}, ${num(specs, 'max_speed_ms')}, ${num(specs, 'battery_wh')}, ${runtime.hours}, ${runtime.basis},
        ${bool(specs, 'hot_swap')}, ${num(specs, 'charge_time_h')},
        ${text(specs, 'compute_module')}, ${num(specs, 'compute_tops')}, ${text(specs, 'ip_rating')}, ${ip.solid}, ${ip.liquid},
        ${temp?.min ?? null}, ${temp?.max ?? null},
        ${bool(specs, 'stair_capable')}, ${num(specs, 'max_slope_deg')}, ${num(specs, 'step_height_m')}, ${bool(specs, 'outdoor_rated')}, ${num(specs, 'noise_db')},
        array(select jsonb_array_elements_text(${certifications}::jsonb)),
        array(select jsonb_array_elements_text(${tasks}::jsonb)),
        ${text(specs, 'requires_operator')}, ${count(specs, 'trl')},
        ${JSON.stringify(specs)}::jsonb, ${JSON.stringify(conflicts)}::jsonb,
        array(select jsonb_array_elements_text(${JSON.stringify(verified)}::jsonb)),
        ${completeness}, now(), ${runId ?? null})
      on conflict (robot_id) do update set
        height_m = excluded.height_m, height_min_m = excluded.height_min_m, height_max_m = excluded.height_max_m,
        weight_kg = excluded.weight_kg, payload_kg_conservative = excluded.payload_kg_conservative,
        payload_kg_rated = excluded.payload_kg_rated, payload_kg_peak = excluded.payload_kg_peak, reach_m = excluded.reach_m,
        dof_total = excluded.dof_total, dof_body = excluded.dof_body, dof_arms = excluded.dof_arms,
        dof_legs = excluded.dof_legs, dof_hands = excluded.dof_hands,
        walk_speed_ms = excluded.walk_speed_ms, max_speed_ms = excluded.max_speed_ms, battery_wh = excluded.battery_wh,
        runtime_h = excluded.runtime_h, runtime_basis = excluded.runtime_basis, hot_swap = excluded.hot_swap,
        charge_time_h = excluded.charge_time_h, compute_module = excluded.compute_module, compute_tops = excluded.compute_tops,
        ip_rating = excluded.ip_rating, ip_solid = excluded.ip_solid, ip_liquid = excluded.ip_liquid,
        temp_min_c = excluded.temp_min_c, temp_max_c = excluded.temp_max_c, stair_capable = excluded.stair_capable,
        max_slope_deg = excluded.max_slope_deg, step_height_m = excluded.step_height_m, outdoor_rated = excluded.outdoor_rated,
        noise_db = excluded.noise_db, certifications = excluded.certifications, task_capabilities = excluded.task_capabilities,
        requires_operator = excluded.requires_operator, trl = excluded.trl, specs = excluded.specs, conflicts = excluded.conflicts,
        verified_fields = excluded.verified_fields, completeness = excluded.completeness, built_at = excluded.built_at,
        built_from_run = excluded.built_from_run`;

    await rebuildPrices(sql, id);
    await rebuildAvailability(sql, id);
  }
  return ids.length;
}

async function rebuildPrices(sql: SqlClient, robotId: string) {
  await sql`delete from price_current where robot_id = ${robotId}`;
  await sql`
    insert into price_current (robot_id, region, config, amount, currency, tier, direct, includes_vat,
                               source_id, source_url, observed_at, stale)
    select distinct on (region, config)
           robot_id, region, config, amount, currency, tier, direct, includes_vat,
           source_id, source_url, observed_at, observed_at < now() - interval '90 days'
    from price_observations
    where robot_id = ${robotId}
    order by region, config, tier asc, direct desc, observed_at desc`;
}

async function rebuildAvailability(sql: SqlClient, robotId: string) {
  await sql`delete from availability_current where robot_id = ${robotId}`;
  await sql`
    insert into availability_current (robot_id, region, status, in_stock, lead_time_days_min, lead_time_days_max,
                                      lead_time_text, source_url, observed_at)
    select distinct on (region)
           robot_id, region, status, in_stock, lead_time_days_min, lead_time_days_max, lead_time_text, source_url, observed_at
    from availability_observations
    where robot_id = ${robotId}
    order by region, observed_at desc`;
}
