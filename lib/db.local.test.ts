import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
  constructed: vi.fn(),
  exec: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue({ rows: [{ answer: 42 }] }),
  close: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('node:fs', () => ({ existsSync: () => false, readFileSync: () => '' }));
vi.mock('@electric-sql/pglite', () => ({ PGlite: class {
  waitReady = Promise.resolve();
  exec = database.exec;
  query = database.query;
  close = database.close;
  constructor(directory: unknown) { database.constructed(directory); }
} }));
const processState = globalThis as typeof globalThis & { __sitebotsLocalDb?: Map<string, unknown> };

beforeEach(() => {
  delete processState.__sitebotsLocalDb;
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('LOCAL_DB_DIR', '.out/database-lifecycle-test');
  vi.stubEnv('SEED_LOCAL', '0');
});
afterEach(() => { delete processState.__sitebotsLocalDb; vi.unstubAllEnvs(); });

describe('local database ownership across module reloads', () => {
  it('shares one live database through concurrent requests and development module reloads', async () => {
    const first = await import('./db.local');
    const [a, b] = await Promise.all([first.localSql(), first.localSql()]);
    vi.resetModules();
    const reloaded = await import('./db.local');
    const c = await reloaded.localSql();
    expect(a).toBe(b);
    expect(c).toBe(a);
    expect(database.constructed).toHaveBeenCalledTimes(1);
    expect(await c.query('select 42 as answer')).toEqual([{ answer: 42 }]);
    await reloaded.closeLocal();
    await first.localSql();
    expect(database.close).toHaveBeenCalledTimes(1);
    expect(database.constructed).toHaveBeenCalledTimes(2);
  });

  it('closes a failed startup and permits a clean retry', async () => {
    database.exec.mockRejectedValueOnce(new Error('startup failed'));
    const local = await import('./db.local');
    await expect(local.localSql()).rejects.toThrow('startup failed');
    expect(database.close).toHaveBeenCalledTimes(1);
    expect(await (await local.localSql()).query('select 42 as answer')).toEqual([{ answer: 42 }]);
    expect(database.constructed).toHaveBeenCalledTimes(2);
  });

  it('keeps databases in different directories separate', async () => {
    const first = await import('./db.local');
    const a = await first.localSql();
    vi.stubEnv('LOCAL_DB_DIR', '.out/another-database-lifecycle-test');
    vi.resetModules();
    const second = await import('./db.local');
    expect(await second.localSql()).not.toBe(a);
    expect(database.constructed).toHaveBeenCalledTimes(2);
  });
});
