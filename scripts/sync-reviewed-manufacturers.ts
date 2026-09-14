import reviewData from '@/data/manufacturers/review.json';
import { isPublicManufacturer, manufacturerReview } from '@/lib/manufacturers';
import { db, done, preflight } from './_guard';

async function main() {
  const sql = await db();
  await preflight(sql, 'Reviewed manufacturer metadata');
  let count = 0;
  for (const slug of Object.keys(reviewData.manufacturers)) {
    if (!isPublicManufacturer(slug)) continue;
    const review = manufacturerReview(slug)!;
    const country = review.country;
    await sql`update manufacturers set name = ${review.name}, website_url = coalesce(${review.website}, website_url), country = coalesce(${country ?? null}, country) where slug = ${slug}`;
    count++;
  }
  // Keep the curated assessment table consistent with the reviewed YAML without deleting history.
  for (const path of ['data/curated/boston-dynamics/spot.yaml', 'data/curated/anybotics/anymal-d.yaml']) {
    await sql`update curated_entries set value_json = 'null'::jsonb, note = 'A removable battery is documented; replacement while the robot remains powered on is not confirmed.', updated_at = now() where field = 'hot_swap' and file_path = ${path}`;
  }
  console.log(`${count} reviewed manufacturer metadata records processed.`);
}
main().then(() => done()).catch(e => { console.error(e); return done(1); });
