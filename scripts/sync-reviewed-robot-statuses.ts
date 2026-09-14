import { db, done, preflight } from './_guard';
import { robotStatusReviews } from '@/lib/ingest/status-review';
import { insertAvailability, insertPrices } from '@/lib/ingest/facts';
import { buildCurrent } from '@/lib/ingest/current';
import { sourceForUrl, upsertSources } from '@/lib/ingest/sources';

async function main() {
  const sql = await db();
  await preflight(sql, 'Reviewed robot lifecycle and purchase availability');
  const changes = [];
  for (const review of robotStatusReviews) {
    const source = sourceForUrl(review.sourceUrl);
    if (!source || source.kind !== 'manufacturer' || source.tier !== 1) throw Error('Status review needs a registered official manufacturer source: ' + review.sourceUrl);
    const rows = await sql.query('select r.id, r.status from robots r join manufacturers m on m.id = r.manufacturer_id where m.slug = $1 and r.model_slug = $2 and r.variant = $3', [review.manufacturer, review.model, review.variant]);
    if (rows.length !== 1) throw Error('Exact robot not found: ' + review.manufacturer + '/' + review.model + '/' + review.variant);
    changes.push({ review, source, id: String(rows[0].id), previousStatus: rows[0].status });
  }
  await upsertSources(sql);
  for (const { review, source, id, previousStatus } of changes) {
    await sql.query('update robots set status = $1, updated_at = now() where id = $2', [review.status, id]);
    await insertAvailability(sql, id, [{ region: review.availability.region, status: review.availability.status, lead_time_text: review.availability.note, source_id: source.id, source_url: review.sourceUrl, observed_at: review.observedAt }]);
    if (review.price) await insertPrices(sql, id, [{ amount: review.price.amount, currency: review.price.currency, region: review.price.region, config: review.price.config, includes_vat: review.price.includesVat, note: review.price.note, tier: 1, direct: true, source_id: source.id, source_url: review.sourceUrl, observed_at: review.observedAt }]);
    console.log(review.manufacturer + '/' + review.model + ': ' + previousStatus + ' -> ' + review.status + '; ' + review.availability.status + ' from ' + review.sourceUrl);
  }
  await buildCurrent(sql, changes.map(c => c.id));
}
main().then(() => done()).catch(e => { console.error(e); return done(1); });
