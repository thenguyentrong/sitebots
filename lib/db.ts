import { neon } from '@neondatabase/serverless';

export type Rows = Record<string, unknown>[];

/** The subset of the Neon driver the app uses; PGlite is adapted to match. */
export type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<Rows>;
  query(text: string, params?: unknown[]): Promise<Rows>;
};

/**
 * Development runs on an in-process PGlite. Production does too until the
 * Neon database exists: with no DATABASE_URL the app boots the committed
 * snapshot (data/snapshot/pglite.tar.gz) read-only in memory, so the live
 * site shows the whole catalogue rather than failing or seeding eleven robots.
 * Set DATABASE_URL and the snapshot is ignored.
 */
export function useLocal(): boolean {
  if (process.env.DATABASE_URL) return false;
  return process.env.USE_LOCAL_DB === '1' || process.env.NODE_ENV === 'production';
}

let cached: Promise<SqlClient> | null = null;

/**
 * Lazy: `neon()` throws when DATABASE_URL is unset, and Next evaluates module
 * top-level code at build time, so a module-level client crashes `next build`
 * before the env vars exist.
 */
export function getSql(): Promise<SqlClient> {
  if (!cached) {
    cached = useLocal()
      ? import('./db.local').then((m) => m.localSql())
      : Promise.resolve(neon(process.env.DATABASE_URL!) as unknown as SqlClient);
  }
  return cached;
}
