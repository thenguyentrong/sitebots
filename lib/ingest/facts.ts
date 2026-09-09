import { createHash } from 'node:crypto';
import type { SqlClient } from '@/lib/db';
import type { NormalizedAvailability, NormalizedFact, NormalizedPrice } from '@/lib/spec/types';

/**
 * Identity of a fact for de-duplication: what was said, by which URL. The
 * observation date is deliberately not part of it — a weekly re-scrape that
 * sees the same value refreshes `observed_at` on the existing row instead of
 * appending a copy, while a changed value gets its own row and the old one
 * stays as history.
 */
export function factHash(f: NormalizedFact): string {
  const parts = [
    f.field,
    f.qualifier ?? '',
    f.value_num ?? '',
    f.value_min ?? '',
    f.value_max ?? '',
    f.value_text ?? '',
    f.value_bool ?? '',
    f.value_json === undefined || f.value_json === null ? '' : JSON.stringify(f.value_json),
    f.unit ?? '',
    f.source_url,
  ];
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
}

export async function upsertFacts(sql: SqlClient, robotId: string, facts: NormalizedFact[]): Promise<number> {
  let n = 0;
  for (const f of facts) {
    const json = f.value_json === undefined || f.value_json === null ? null : JSON.stringify(f.value_json);
    await sql`
      insert into robot_facts (
        robot_id, field, qualifier, value_num, value_min, value_max, value_text, value_bool, value_json,
        unit, raw_value, raw_unit, source_id, source_url, evidence_url, source_tier, observed_at,
        snapshot_id, run_id, confidence, note, fact_hash)
      values (
        ${robotId}, ${f.field}, ${f.qualifier ?? null}, ${f.value_num ?? null}, ${f.value_min ?? null},
        ${f.value_max ?? null}, ${f.value_text ?? null}, ${f.value_bool ?? null}, ${json}::jsonb,
        ${f.unit ?? null}, ${f.raw_value ?? null}, ${f.raw_unit ?? null}, ${f.source_id ?? null},
        ${f.source_url}, ${f.evidence_url ?? null}, ${f.source_tier}, ${f.observed_at}::timestamptz,
        ${f.snapshot_id ?? null}, ${f.run_id ?? null}, ${f.confidence}, ${f.note ?? null}, ${factHash(f)})
      on conflict (robot_id, fact_hash) do update set
        observed_at = greatest(robot_facts.observed_at, excluded.observed_at),
        run_id = coalesce(excluded.run_id, robot_facts.run_id),
        snapshot_id = coalesce(excluded.snapshot_id, robot_facts.snapshot_id),
        confidence = excluded.confidence,
        note = coalesce(excluded.note, robot_facts.note),
        evidence_url = coalesce(excluded.evidence_url, robot_facts.evidence_url)`;
    n++;
  }
  return n;
}

export async function insertPrices(sql: SqlClient, robotId: string, prices: NormalizedPrice[]): Promise<number> {
  let n = 0;
  for (const p of prices) {
    await sql`
      insert into price_observations (
        robot_id, amount, currency, region, tier, direct, config, includes_vat, sku,
        source_id, source_url, evidence_url, observed_at, snapshot_id, run_id, note)
      values (
        ${robotId}, ${p.amount}, ${p.currency}, ${p.region}, ${p.tier}, ${p.direct}, ${p.config},
        ${p.includes_vat ?? null}, ${p.sku ?? null}, ${p.source_id ?? null}, ${p.source_url},
        ${p.evidence_url ?? null}, ${p.observed_at}::timestamptz, ${p.snapshot_id ?? null},
        ${p.run_id ?? null}, ${p.note ?? null})
      on conflict (robot_id, source_url, region, config, amount, currency, observed_day) do nothing`;
    n++;
  }
  return n;
}

export async function insertAvailability(
  sql: SqlClient,
  robotId: string,
  rows: NormalizedAvailability[],
): Promise<number> {
  let n = 0;
  for (const a of rows) {
    await sql`
      insert into availability_observations (
        robot_id, region, status, in_stock, lead_time_days_min, lead_time_days_max, lead_time_text,
        source_id, source_url, observed_at, run_id)
      values (
        ${robotId}, ${a.region}, ${a.status}, ${a.in_stock ?? null}, ${a.lead_time_days_min ?? null},
        ${a.lead_time_days_max ?? null}, ${a.lead_time_text ?? null}, ${a.source_id ?? null},
        ${a.source_url}, ${a.observed_at}::timestamptz, ${a.run_id ?? null})
      on conflict (robot_id, source_url, region, status, observed_day) do nothing`;
    n++;
  }
  return n;
}
