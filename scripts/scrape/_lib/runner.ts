import { FetchRefused, politeFetch } from './fetch';
import type { Ctx, RawRecord, Snapshot, SourceAdapter } from './types';

export type RunResult = {
  records: RawRecord[];
  snapshots: Snapshot[];
  fetched: number;
  cached: number;
  errors: string[];
  /** A 403 from the source: stop this adapter and mark the source. */
  blocked: boolean;
};

/**
 * Drive one adapter: index → records → parse. Errors on a single page are
 * collected, not fatal; a 403 ends the run for that adapter because the next
 * request would only make it worse.
 */
export async function runAdapter(
  adapter: SourceAdapter,
  opts: { limit?: number; only?: string; fresh?: boolean; log: (m: string) => void },
): Promise<RunResult> {
  const result: RunResult = { records: [], snapshots: [], fetched: 0, cached: 0, errors: [], blocked: false };
  const ctx: Ctx = {
    fetch: async (url, o) => {
      const snap = await politeFetch(url, { ...o, fresh: opts.fresh || o?.fresh });
      result.fetched++;
      if (snap.fromCache) result.cached++;
      return snap;
    },
    log: opts.log,
    limit: opts.limit,
    only: opts.only,
    fresh: opts.fresh,
  };

  opts.log(`${adapter.id}: reading index`);
  let entries = await adapter.fetchIndex(ctx);
  if (opts.only) entries = entries.filter((e) => e.slug === opts.only || e.url === opts.only);
  if (opts.limit) entries = entries.slice(0, opts.limit);
  opts.log(`${adapter.id}: ${entries.length} entries`);

  for (const entry of entries) {
    try {
      const snap = await adapter.fetchRecord(entry, ctx);
      const records = adapter.parse(snap, entry);
      result.snapshots.push(snap);
      result.records.push(...records);
      opts.log(`${entry.slug}: ${records.length} record(s)${snap.fromCache ? ' (cache)' : ''}`);
    } catch (e) {
      if (e instanceof FetchRefused) {
        result.errors.push(`${entry.url}: ${e.code} — ${e.message}`);
        if (e.code === 'blocked') {
          result.blocked = true;
          opts.log(`${adapter.id}: blocked by the source, stopping`);
          break;
        }
      } else {
        result.errors.push(`${entry.url}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return result;
}
