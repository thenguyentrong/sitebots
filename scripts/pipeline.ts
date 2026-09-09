// scrape → normalize → load → merge, against the database behind scripts/_guard.ts.
//
//   npm run pipeline -- --adapter unitree-shop                 dry run
//   npm run pipeline -- --adapter unitree-shop --commit        write
//   npm run pipeline -- --adapter all --commit --fresh         ignore the disk cache
//
// With USE_LOCAL_DB=1 in .env.local this rehearses against PGlite (stop
// `next dev` first, or use POST /api/admin/refresh against the running app).
// Unresolved subjects are appended to .cache/unresolved.jsonl for the owner
// to add to data/aliases.yaml; they are never guessed.

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { COMMIT, db, done, preflight } from './_guard';
import { runPipelineFor } from '@/lib/ingest/pipeline';
import { args, num, str } from './scrape/_lib/args';
import { selectAdapters } from './scrape/adapters';

async function main() {
  const a = args();
  const adapters = selectAdapters(str(a.adapter));
  const sql = await db();
  await preflight(sql, 'sitebots pipeline');

  const cacheDir = join(process.cwd(), '.cache');
  mkdirSync(cacheDir, { recursive: true });
  const unresolvedFile = join(cacheDir, 'unresolved.jsonl');

  for (const adapter of adapters) {
    const s = await runPipelineFor(sql, adapter, {
      limit: num(a.limit),
      only: str(a.only),
      fresh: a.fresh === true,
      dryRun: !COMMIT,
      log: (m) => console.log(`  ${m}`),
      onUnresolved: (raw) =>
        appendFileSync(unresolvedFile, JSON.stringify({ adapter: adapter.id, at: raw.observed_at, subject: raw.subject, url: raw.source_url }) + '\n'),
    });
    console.log(
      `\n${s.adapter}: ${s.records} records, ${s.robots} robots, ${s.facts} facts, ${s.prices} prices, ${s.unresolved} unresolved, ${s.warnings} warnings → ${s.status}`,
    );
    for (const e of s.errors) console.log(`  error: ${e}`);
  }
}

main()
  .then(() => done(0))
  .catch((e) => {
    console.error(e);
    return done(1);
  });
