// Load data/curated/**/*.yaml into the database behind scripts/_guard.ts.
//
//   node --env-file-if-exists=.env.local --import tsx scripts/load-curated.ts --commit
//
// The PGlite boot in lib/db.local.ts applies the curated files on every
// start, so locally it is enough to restart `next dev`. This script is for
// Neon, and for validating the files without a server (`--check`).

import { applyCurated, loadCuratedFiles } from '@/lib/curated/load';
import { db, done, preflight } from './_guard';

async function main() {
  const files = loadCuratedFiles();
  console.log(`${files.length} curated file(s) valid`);
  for (const f of files) console.log(`  ${f.path}: ${Object.keys(f.file.entries).length} entries, variants ${f.file.variants.join(', ')}`);
  if (process.argv.includes('--check')) return;
  const sql = await db();
  await preflight(sql, 'sitebots curated');
  const s = await applyCurated(sql, files);
  console.log(`applied to ${s.robots} robots: ${s.entries} entries, ${s.facts} facts`);
}

main()
  .then(() => done(0))
  .catch((e) => {
    console.error(e);
    return done(1);
  });
