// Scrape only: fetch and parse, write records to .cache/records/{adapter}/{date}.jsonl,
// print a summary. No database. Use scripts/pipeline.ts to load.
//
//   npm run scrape -- --adapter unitree-shop [--limit 5] [--only slug] [--fresh]

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { args, num, str } from './_lib/args';
import { selectAdapters } from './adapters';
import { runAdapter } from './_lib/runner';

async function main() {
const a = args();
const adapters = selectAdapters(str(a.adapter));

for (const adapter of adapters) {
  const result = await runAdapter(adapter, {
    limit: num(a.limit),
    only: str(a.only),
    fresh: a.fresh === true,
    log: (m) => console.log(`  ${m}`),
  });
  const dir = join(process.cwd(), '.cache', 'records', adapter.id);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${new Date().toISOString().slice(0, 10)}.jsonl`);
  writeFileSync(file, '');
  for (const r of result.records) appendFileSync(file, JSON.stringify(r) + '\n');

  console.log(`\n${adapter.id}: ${result.fetched} fetched (${result.cached} from cache), ${result.records.length} records → ${file}`);
  const rows = result.records.map((r) => ({
    subject: `${r.subject.manufacturer_raw} / ${r.subject.model_raw}${r.subject.variant_raw ? ' / ' + r.subject.variant_raw : ''}`,
    fields: r.fields.length,
    prices: r.prices.map((p) => `${p.config ?? 'base'} ${p.currency} ${p.amount}`).join(', ') || '—',
    availability: r.availability.map((x) => x.status).join(', ') || '—',
  }));
  console.table(rows);
  if (result.errors.length) {
    console.log(`errors (${result.errors.length}):`);
    for (const e of result.errors) console.log(`  ${e}`);
  }
}
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
