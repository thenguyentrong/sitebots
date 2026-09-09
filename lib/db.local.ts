import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { Rows, SqlClient } from './db';

/**
 * A local development database — Postgres compiled to WASM, running in-process.
 *
 * Lets the site be cloned and run end to end without provisioning Neon. It is
 * a real Postgres, so db/schema.sql and db/views.sql run against it unmodified.
 * Loaded only from the `USE_LOCAL_DB` branch in db.ts, which refuses to engage
 * in production.
 *
 * An empty local database is seeded from data/seed/robots.json on first boot,
 * so a fresh clone shows real robot pages instead of an empty list. Set
 * SEED_LOCAL=0 to skip that (the pipeline scripts do, they bring their own
 * data).
 *
 * One process at a time: PGlite holds the data directory. Stop `next dev`
 * before running a pipeline script against the same directory, or point the
 * script at another one with LOCAL_DB_DIR.
 */

let ready: Promise<SqlClient> | null = null;
let instance: PGlite | null = null;

/** Scripts call this before exiting; the dev server never does. */
export async function closeLocal(): Promise<void> {
  if (instance) {
    await instance.close();
    instance = null;
    ready = null;
  }
}

function wrap(pg: PGlite): SqlClient {
  // Same call shapes as the Neon driver: a tagged template that returns rows,
  // plus .query(text, params) for the handful of dynamic queries.
  const client = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.reduce(
      (acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ''),
      '',
    );
    const res = await pg.query(text, values);
    return res.rows as Rows;
  }) as SqlClient;

  client.query = async (text: string, params: unknown[] = []) =>
    (await pg.query(text, params)).rows as Rows;

  return client;
}

const SNAPSHOT = join(process.cwd(), 'data', 'snapshot', 'pglite.tar.gz');

async function boot(): Promise<SqlClient> {
  // Production has no writable data directory and no DATABASE_URL yet: load
  // the committed snapshot into memory. Development keeps its on-disk cluster.
  const fromSnapshot = process.env.NODE_ENV === 'production' && !process.env.LOCAL_DB_DIR && existsSync(SNAPSHOT);
  const pg = fromSnapshot
    ? new PGlite({ dataDir: 'memory://', loadDataDir: new Blob([readFileSync(SNAPSHOT)]) })
    : new PGlite(process.env.LOCAL_DB_DIR ?? '.pglite');
  instance = pg;
  await pg.waitReady;
  if (fromSnapshot) console.log('[db.local] booted from data/snapshot/pglite.tar.gz');

  const root = process.cwd();
  await pg.exec(readFileSync(join(root, 'db', 'schema.sql'), 'utf8'));
  await pg.exec(readFileSync(join(root, 'db', 'views.sql'), 'utf8'));

  const client = wrap(pg);

  if (process.env.SEED_LOCAL !== '0') {
    const [{ n }] = (await client`select count(*)::int as n from robots`) as { n: number }[];
    if (n === 0) {
      const { seedDatabase } = await import('./ingest/seed');
      const summary = await seedDatabase(client);
      console.log(`[db.local] seeded ${summary.robots} robots, ${summary.facts} facts from data/seed`);
    }
    // The curated construction layer is re-applied on every boot: edit a YAML,
    // restart, see it. Idempotent and small.
    const { applyCurated } = await import('./curated/load');
    const c = await applyCurated(client);
    console.log(`[db.local] curated: ${c.robots} robots, ${c.entries} entries`);
  }

  return client;
}

export function localSql(): Promise<SqlClient> {
  if (!ready) ready = boot();
  return ready;
}
