import { readFileSync } from 'node:fs';
import { db, done, preflight } from './_guard';
import { normalizeField } from './normalize';
import { upsertFacts } from '@/lib/ingest/facts';
import { buildCurrent } from '@/lib/ingest/current';
import { sourceForUrl, upsertSources } from '@/lib/ingest/sources';
import type { RawField } from './scrape/_lib/types';

async function main() {
  const data = JSON.parse(readFileSync('data/specifications/manual.json', 'utf8')) as { entries: { robot: string; sourceUrl: string; evidenceUrl: string; observedAt: string; fields: RawField[] }[] };
  const entries = data.entries.map(entry => {
    const source = sourceForUrl(entry.sourceUrl);
    if (source?.tier !== 1 || source.kind !== 'manufacturer' || !entry.observedAt) throw Error(`Unreviewed source: ${entry.robot}`);
    const facts = entry.fields.map(field => {
      const result = normalizeField({ ...field, evidence_url: entry.evidenceUrl, confidence: .9 }, { source_id: source.id, source_url: entry.sourceUrl, source_tier: 1, observed_at: entry.observedAt });
      if (!result.fact) throw Error(`${entry.robot}: ${result.warning}`);
      return result.fact;
    });
    return { ...entry, facts };
  });
  const sql = await db();
  await preflight(sql, 'Reviewed specification sheets');
  await upsertSources(sql);
  const ids: string[] = [];
  let count = 0;
  for (const entry of entries) {
    const [manufacturer, model] = entry.robot.split('/');
    const rows = await sql`select r.id from robots r join manufacturers m on m.id = r.manufacturer_id where m.slug = ${manufacturer} and r.model_slug = ${model} and r.variant = 'base'`;
    if (rows.length !== 1) throw Error(`Exact robot not found: ${entry.robot}`);
    const id = String(rows[0].id);
    count += await upsertFacts(sql, id, entry.facts);
    ids.push(id);
  }
  await buildCurrent(sql, ids);
  console.log(`${count} reviewed specification values across ${ids.length} robots.`);
}
main().then(() => done()).catch(e => { console.error(e); return done(1); });
