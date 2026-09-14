import { expect, it } from 'vitest';
import { lifecycleFromEvidence, type LifecycleEvidence } from './lifecycle';
const now = Date.parse('2026-09-13T23:00:00Z');
const row = (status: LifecycleEvidence['status'], extra: Partial<LifecycleEvidence> = {}): LifecycleEvidence => ({ status, source_url: 'https://maker.example/robot', observed_at: '2026-09-13T12:00:00Z', source_kind: 'manufacturer', source_tier: 1, ...extra });
it('reconciles commercial, quote-only and preorder evidence independently of price', () => {
  expect(lifecycleFromEvidence([row('for_sale')], now)?.status).toBe('shipping');
  expect(lifecycleFromEvidence([row('enterprise_only')], now)?.status).toBe('shipping');
  expect(lifecycleFromEvidence([row('pre_order')], now)?.status).toBe('pre_order');
});
it('does not promote third-party sale claims, stale evidence or unavailable checkout', () => {
  expect(lifecycleFromEvidence([row('for_sale', { source_kind: 'aggregator', source_tier: 3 })], now)).toBeNull();
  expect(lifecycleFromEvidence([row('for_sale', { observed_at: '2025-01-01' })], now)).toBeNull();
  expect(lifecycleFromEvidence([row('unknown')], now)).toBeNull();
  expect(lifecycleFromEvidence([row('not_sold')], now)).toBeNull();
});
it('uses the latest manufacturer evidence and flags simultaneous disagreement', () => {
  expect(lifecycleFromEvidence([row('for_sale'), row('discontinued', { observed_at: '2026-09-13T13:00:00Z' })], now)?.status).toBe('discontinued');
  expect(lifecycleFromEvidence([row('for_sale'), row('pre_order')], now)).toBeNull();
});

it('the real projection prefers official availability and updates stored lifecycle', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { readFileSync } = await import('node:fs');
  const { ensureRobot } = await import('./entities');
  const { buildCurrent } = await import('./current');
  const { insertAvailability } = await import('./facts');
  const { upsertSources } = await import('./sources');
  const pg = new PGlite('memory://');
  try {
    await pg.exec(readFileSync('db/schema.sql', 'utf8'));
    const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => (await pg.query(strings.reduce((text, part, i) => text + part + (i < values.length ? `$${i + 1}` : ''), ''), values)).rows) as import('@/lib/db').SqlClient;
    sql.query = async (text, params) => (await pg.query(text, params)).rows as import('@/lib/db').Rows;
    await upsertSources(sql);
    const id = await ensureRobot(sql, { manufacturerSlug: 'unitree', modelSlug: 'b2', status: 'unknown' });
    const official = { region: 'GLOBAL' as const, status: 'enterprise_only' as const, source_id: 'shop.unitree.com', source_url: 'https://shop.unitree.com/products/unitree-b2', observed_at: new Date(Date.now() - 60000).toISOString(), in_stock: false };
    await insertAvailability(sql, id, [official]);
    // A correction on the same day must replace incorrect stock data.
    await insertAvailability(sql, id, [{ ...official, in_stock: null, observed_at: new Date(Date.now() - 30000).toISOString() }]);
    await insertAvailability(sql, id, [{ ...official, status: 'pre_order', source_id: 'robotpriceindex.com', source_url: 'https://robotpriceindex.com/robots/unitree-b2', observed_at: new Date().toISOString() }]);
    await buildCurrent(sql, [id]);
    expect((await pg.query('select status from robots where id = $1', [id])).rows).toEqual([{ status: 'shipping' }]);
    expect((await pg.query('select status, in_stock, source_kind, source_tier from availability_current where robot_id = $1', [id])).rows).toEqual([{ status: 'enterprise_only', in_stock: null, source_kind: 'manufacturer', source_tier: 1 }]);
  } finally { await pg.close(); }
}, 15000);
