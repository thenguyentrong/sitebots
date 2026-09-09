import { hostname } from 'node:os';
import type { SqlClient } from '@/lib/db';
import { normalizeRecord } from '@/scripts/normalize';
import { runAdapter } from '@/scripts/scrape/_lib/runner';
import { persistSnapshot } from '@/scripts/scrape/_lib/snapshot';
import type { RawRecord, SourceAdapter } from '@/scripts/scrape/_lib/types';
import { buildCurrent } from './current';
import { ensureRobot } from './entities';
import { insertAvailability, insertPrices, upsertFacts } from './facts';
import { upsertSources } from './sources';

export type PipelineOptions = {
  limit?: number;
  only?: string;
  fresh?: boolean;
  log?: (msg: string) => void;
  /** Called for subjects no alias file resolves; the CLI appends them to .cache/unresolved.jsonl. */
  onUnresolved?: (raw: RawRecord) => void;
  /** Dry runs cannot create robots; report instead of throwing. */
  dryRun?: boolean;
};

export type AdapterSummary = {
  adapter: string;
  records: number;
  robots: number;
  facts: number;
  prices: number;
  unresolved: number;
  warnings: number;
  errors: string[];
  status: 'ok' | 'partial';
  blocked: boolean;
};

/**
 * scrape → normalize → load → merge for one adapter, against whatever SqlClient
 * it is handed: the guarded handle from scripts/_guard.ts, the PGlite behind
 * `next dev`, or Neon from a route handler. The CLI and the admin route share
 * this so there is one pipeline, not two that drift.
 */
export async function runPipelineFor(sql: SqlClient, adapter: SourceAdapter, opts: PipelineOptions = {}): Promise<AdapterSummary> {
  const log = opts.log ?? (() => {});
  await upsertSources(sql);

  const [run] = (await sql`
    insert into scrape_runs (adapter, args, host)
    values (${adapter.id}, ${JSON.stringify({ limit: opts.limit ?? null, only: opts.only ?? null, fresh: Boolean(opts.fresh) })}::jsonb, ${hostname()})
    returning id`) as { id: string }[];
  const runId = run?.id ?? null;

  const result = await runAdapter(adapter, { limit: opts.limit, only: opts.only, fresh: opts.fresh, log });

  for (const snap of result.snapshots) {
    await persistSnapshot(sql, snap, { runId, sourceId: adapter.source.id });
  }

  const touched = new Set<string>();
  let facts = 0;
  let prices = 0;
  let unresolved = 0;
  let warnings = 0;

  for (const raw of result.records) {
    const rec = normalizeRecord(raw, { run_id: runId });
    for (const w of rec.warnings) {
      warnings++;
      log(`warn ${raw.subject.model_raw}: ${w}`);
    }
    if (!rec.subject) {
      unresolved++;
      opts.onUnresolved?.(raw);
      continue;
    }
    let robotId: string;
    try {
      robotId = await ensureRobot(sql, {
        manufacturerSlug: rec.subject.manufacturerSlug,
        modelSlug: rec.subject.modelSlug,
        variant: rec.subject.variant,
        status: raw.subject.status_hint,
        releaseYear: raw.subject.release_year_hint ?? null,
      });
    } catch (e) {
      if (opts.dryRun) {
        log(`[dry-run] ${rec.subject.manufacturerSlug}/${rec.subject.modelSlug}/${rec.subject.variant}: ${rec.facts.length} facts, ${rec.prices.length} prices, ${rec.availability.length} availability rows`);
        continue;
      }
      throw e;
    }
    touched.add(robotId);
    facts += await upsertFacts(sql, robotId, rec.facts);
    prices += await insertPrices(sql, robotId, rec.prices);
    await insertAvailability(sql, robotId, rec.availability);
  }

  if (touched.size) await buildCurrent(sql, [...touched], runId);

  const status = result.blocked || result.errors.length ? 'partial' : 'ok';
  if (runId) {
    await sql`
      update scrape_runs set finished_at = now(), status = ${status}, fetched = ${result.fetched},
        cached = ${result.cached}, parsed = ${result.records.length}, facts = ${facts},
        errors = ${JSON.stringify(result.errors)}::jsonb
      where id = ${runId}`;
  }
  if (result.blocked) await sql`update sources set blocked_at = now() where id = ${adapter.source.id}`;

  return {
    adapter: adapter.id,
    records: result.records.length,
    robots: touched.size,
    facts,
    prices,
    unresolved,
    warnings,
    errors: result.errors,
    status,
    blocked: result.blocked,
  };
}
