// Safety wrapper for every script that writes to the database.
//
// Development, preview and production may all point at the SAME Neon database,
// so a pipeline run writes straight into what the site serves. To make that
// survivable, scripts get their `sql` handle from db() instead of calling
// neon() directly: writes are blocked and logged unless the script was started
// with --commit.
//
//   npm run pipeline -- --adapter unitree-shop            → dry run, nothing written
//   npm run pipeline -- --adapter unitree-shop --commit   → writes for real
//
// With USE_LOCAL_DB=1 the same guard wraps the in-process PGlite, so a script
// can be rehearsed locally with exactly the flags it will run with in
// production. Stop `next dev` first — PGlite is single-process.
import { connect } from 'node:net';
import { neon } from '@neondatabase/serverless';
import type { SqlClient } from '@/lib/db';

export const COMMIT = process.argv.includes('--commit');

const WRITE_RE = /^\s*(insert|update|delete|drop|create|alter|truncate|grant|revoke|comment|refresh)\b/i;

let blocked = 0;
let bannerPrinted = false;

function banner() {
  if (bannerPrinted) return;
  bannerPrinted = true;
  console.log(
    COMMIT
      ? '\n*** COMMIT MODE — writing to the database ***\n'
      : '\n*** DRY RUN — no writes. Re-run with --commit to apply. ***\n',
  );
}

function preview(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 110 ? flat.slice(0, 110) + '…' : flat;
}

function textFromTemplate(strings: TemplateStringsArray, values: unknown[]): string {
  return strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ''), '');
}

function guardText(text: string): boolean {
  if (COMMIT || !WRITE_RE.test(text)) return false;
  blocked++;
  console.log(`  [dry-run] would run: ${preview(text)}`);
  return true;
}

function guarded(raw: SqlClient): SqlClient {
  const tagged = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    if (guardText(textFromTemplate(strings, values))) return Promise.resolve([]);
    return raw(strings, ...values);
  }) as SqlClient;
  tagged.query = (text: string, params?: unknown[]) =>
    guardText(text) ? Promise.resolve([]) : raw.query(text, params);
  return tagged;
}

/** True when something answers on the port — in this project that is `next dev`, which owns the PGlite directory. */
function listening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = connect({ port, host: '127.0.0.1' });
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
    s.setTimeout(500, () => { s.destroy(); resolve(false); });
  });
}

/**
 * Database handle that refuses to write in dry-run mode. Blocked statements
 * resolve to [] so the script still reaches its summary instead of dying
 * halfway with a stack trace — read the [dry-run] lines, not the row counts,
 * when running without --commit.
 */
export async function db(): Promise<SqlClient> {
  banner();
  if (process.env.USE_LOCAL_DB === '1') {
    if (!process.env.LOCAL_DB_DIR && (await listening(Number(process.env.PORT ?? 3000)))) {
      throw new Error(
        'next dev is listening and holds .pglite. A second PGlite on the same directory corrupts the cluster ' +
          '(it did on 2026-09-09, full rebuild) — stop the dev server first, or point this script at another ' +
          'directory with LOCAL_DB_DIR. Reads are not safe either.',
      );
    }
    process.env.SEED_LOCAL ??= '0';
    const { localSql } = await import('@/lib/db.local');
    return guarded(await localSql());
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL missing — run with `node --env-file-if-exists=.env.local --import tsx …`, or set USE_LOCAL_DB=1',
    );
  }
  return guarded(neon(url) as unknown as SqlClient);
}

export function target(): string {
  if (process.env.USE_LOCAL_DB === '1') return `pglite:${process.env.LOCAL_DB_DIR ?? '.pglite'}`;
  const host = (process.env.DATABASE_URL ?? '').match(/@([^/?]+)/)?.[1] ?? 'unknown';
  return `neon:${host}`;
}

/** Print what database we are pointed at and how big it is, before anything happens. */
export async function preflight(sql: SqlClient, label: string) {
  const [c] = (await sql`
    select (select count(*) from robots)::int as robots,
           (select count(*) from robot_facts)::int as facts,
           (select count(*) from price_observations)::int as prices`) as {
    robots: number;
    facts: number;
    prices: number;
  }[];
  console.log(`${label}`);
  console.log(`  target : ${target()}`);
  console.log(`  ledger : ${c.robots} robots · ${c.facts} facts · ${c.prices} price observations`);
  console.log(COMMIT ? '  mode   : COMMIT\n' : '  mode   : DRY RUN (re-run with --commit to apply)\n');
  return c;
}

/**
 * End of a script. Closes PGlite when it was used and exits explicitly: a
 * finished fetch leaves an undici keep-alive socket and PGlite leaves its
 * worker, either of which keeps the event loop alive after main() returns,
 * and a script that "hangs" after printing its summary is indistinguishable
 * from one that is stuck.
 */
export async function done(code = 0): Promise<never> {
  if (process.env.USE_LOCAL_DB === '1') {
    const { closeLocal } = await import('@/lib/db.local');
    await closeLocal();
  }
  summary();
  process.exit(code);
}

/** Closing banner so a dry run never looks like a successful write. */
export function summary() {
  if (COMMIT) return;
  console.log(
    blocked
      ? `\nDRY RUN — ${blocked} write statement(s) skipped. Re-run with --commit to apply.\n`
      : '\nDRY RUN — no write statements were attempted.\n',
  );
}
