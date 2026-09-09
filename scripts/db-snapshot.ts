// db-snapshot.ts — pack the local PGlite database into one file the deployed
// site can boot from when no DATABASE_URL is set.
//
//   node --import tsx scripts/db-snapshot.ts [--from .pglite-copy]
//
// Until the Neon database exists, production runs the same in-process PGlite
// as development, loaded read-only from this snapshot at cold start. The file
// is committed on purpose: the whole catalogue is the point of the site, and
// a deploy without it would show eleven seed robots. Regenerate after every
// --commit that should reach the live site.
import { PGlite } from '@electric-sql/pglite';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'data/snapshot/pglite.tar.gz';

async function main() {
  const i = process.argv.indexOf('--from');
  const dir = i > 0 ? process.argv[i + 1] : '.pglite';
  const pg = new PGlite(dir);
  await pg.waitReady;
  // A checkpoint first, so the tarball holds the tables and not a WAL to replay.
  await pg.exec('checkpoint');
  const [{ n }] = (await pg.query<{ n: number }>('select count(*)::int as n from robots')).rows;
  const blob = await pg.dumpDataDir('gzip');
  mkdirSync('data/snapshot', { recursive: true });
  const buf = Buffer.from(await blob.arrayBuffer());
  writeFileSync(OUT, buf);
  await pg.close();
  console.log(`${OUT}: ${(buf.length / 1024 / 1024).toFixed(1)} MB, ${n} robots, from ${dir}`);
}

main();
