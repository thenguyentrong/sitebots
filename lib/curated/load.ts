import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import type { SqlClient } from '@/lib/db';
import { buildCurrent } from '@/lib/ingest/current';
import { ensureRobot } from '@/lib/ingest/entities';
import { upsertFacts } from '@/lib/ingest/facts';
import type { NormalizedFact } from '@/lib/spec/types';
import { CONFIDENCE_VALUE, CuratedFile, type CuratedEntry } from './schema';

export type LoadedCuratedFile = { path: string; file: CuratedFile };

/** Every YAML under data/curated, validated. A bad file names its path and field. */
export function loadCuratedFiles(root = process.cwd()): LoadedCuratedFile[] {
  const dir = join(root, 'data', 'curated');
  if (!existsSync(dir)) return [];
  const out: LoadedCuratedFile[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.ya?ml$/.test(name)) {
        const rel = relative(root, p).replace(/\\/g, '/');
        const parsed = CuratedFile.safeParse(parse(readFileSync(p, 'utf8')));
        if (!parsed.success) {
          const i = parsed.error.issues[0];
          throw new Error(`${rel}: ${i.path.join('.')}: ${i.message}`);
        }
        out.push({ path: rel, file: parsed.data });
      }
    }
  };
  walk(dir);
  return out;
}

/**
 * Curated entries become tier-0 facts. The source URL is the evidence when
 * there is one — the value was read or inferred there — otherwise a
 * `curated://` pointer to the file, which the page shows as "curated" without
 * a link. A null value is a documented gap: it is kept in curated_entries with
 * its note but produces no fact, because "not published, treat as indoor" is
 * expressed by the outdoor_rated entry, not by an empty IP rating.
 */
function toFact(field: string, entry: CuratedEntry, pointer: string, observedAt: string): NormalizedFact | null {
  if (entry.value === null || entry.value === undefined) return null;
  const base = {
    field,
    qualifier: null,
    source_id: 'curated',
    source_url: entry.evidence_url ?? pointer,
    evidence_url: entry.evidence_url ?? null,
    source_tier: 0,
    observed_at: observedAt,
    confidence: CONFIDENCE_VALUE[entry.confidence] ?? 0.5,
    note: entry.note ?? null,
    raw_value: typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value),
  };
  const v = entry.value;
  if (field === 'operating_temp_c') {
    const t = v as { min_c: number; max_c: number };
    return { ...base, value_min: t.min_c, value_max: t.max_c, unit: '°C' };
  }
  if (typeof v === 'boolean') return { ...base, value_bool: v };
  if (typeof v === 'number') {
    const unit = field === 'max_slope_deg' ? '°' : field === 'step_height_m' || field === 'reach_m' ? 'm' : field === 'noise_db' ? 'dB' : field === 'compute_tops' ? 'TOPS' : field === 'battery_wh' ? 'Wh' : null;
    return { ...base, value_num: v, unit };
  }
  if (typeof v === 'string') return { ...base, value_text: v };
  return { ...base, value_json: v };
}

export async function applyCurated(sql: SqlClient, files = loadCuratedFiles()): Promise<{ robots: number; entries: number; facts: number }> {
  const observedAt = new Date().toISOString();
  const touched = new Set<string>();
  let entries = 0;
  let facts = 0;

  for (const { path, file } of files) {
    for (const variant of file.variants) {
      const robotId = await ensureRobot(sql, { manufacturerSlug: file.manufacturer, modelSlug: file.model, variant });
      touched.add(robotId);
      const merged: Record<string, CuratedEntry> = { ...file.entries, ...(file.by_variant[variant] ?? {}) };
      const factList: NormalizedFact[] = [];
      for (const [field, entry] of Object.entries(merged)) {
        await sql`
          insert into curated_entries (robot_id, field, qualifier, value_json, confidence, note, evidence_url, author, file_path, updated_at)
          values (${robotId}, ${field}, ${null}, ${JSON.stringify(entry.value ?? null)}::jsonb, ${entry.confidence}, ${entry.note ?? null},
                  ${entry.evidence_url ?? null}, ${'sitebots'}, ${path}, now())
          on conflict (robot_id, field, coalesce(qualifier, '')) do update set
            value_json = excluded.value_json, confidence = excluded.confidence, note = excluded.note,
            evidence_url = excluded.evidence_url, file_path = excluded.file_path, updated_at = now()`;
        entries++;
        const fact = toFact(field, entry, `curated://${file.manufacturer}/${file.model}.yaml#${field}`, observedAt);
        if (fact) factList.push(fact);
      }
      // Replace this robot's curated facts wholesale: a removed YAML entry must disappear.
      await sql`delete from robot_facts where robot_id = ${robotId} and source_id = 'curated'`;
      facts += await upsertFacts(sql, robotId, factList);
    }
  }
  if (touched.size) await buildCurrent(sql, [...touched]);
  return { robots: touched.size, entries, facts };
}
