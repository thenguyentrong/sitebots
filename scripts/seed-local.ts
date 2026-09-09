// Load data/seed/robots.json into the database behind scripts/_guard.ts.
//
//   npm run seed:local -- --commit          (USE_LOCAL_DB=1 → PGlite; else Neon)
//
// The PGlite boot in lib/db.local.ts does this automatically on an empty
// database; this script is for re-seeding after the JSON changed, and for
// putting the seed on Neon.
//
// Scripts are wrapped in main() because tsx compiles .ts under a package
// without "type": "module" as CommonJS, where top-level await is not allowed.

import { db, done, preflight } from './_guard';
import { seedDatabase } from '@/lib/ingest/seed';

async function main() {
  const sql = await db();
  await preflight(sql, 'sitebots seed');
  const summary = await seedDatabase(sql);
  console.log(`seeded ${summary.robots} robots, ${summary.facts} facts`);
}

main()
  .then(() => done(0))
  .catch((e) => {
    console.error(e);
    return done(1);
  });
