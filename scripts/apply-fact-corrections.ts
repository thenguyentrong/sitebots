import { readFileSync } from 'node:fs';
import { db, done, preflight } from './_guard';
import { buildCurrent } from '@/lib/ingest/current';

async function main() {
  const data = JSON.parse(readFileSync('data/specifications/invalidated-facts.json', 'utf8')) as { facts: { robot: string; factHash: string; sourceUrl: string; reason: string; reviewedAt: string }[] };
  const sql = await db();
  await preflight(sql, 'Reviewed fact corrections');
  for (const f of data.facts) {
    const [manufacturer, model] = f.robot.split('/');
    await sql`update robot_facts f set invalidated_at = ${f.reviewedAt}::timestamptz, invalidation_reason = ${f.reason}
      from robots r join manufacturers m on m.id = r.manufacturer_id
      where f.robot_id = r.id and m.slug = ${manufacturer} and r.model_slug = ${model}
        and f.fact_hash = ${f.factHash} and f.source_url = ${f.sourceUrl}`;
  }
  await buildCurrent(sql);
  console.log(`${data.facts.length} reviewed fact corrections processed; current projections rebuilt.`);
}
main().then(() => done()).catch(e => { console.error(e); return done(1); });
