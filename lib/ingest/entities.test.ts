import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';
import { ensureRobot } from './entities';
import { reviewedRobotStatus } from './status-review';
import type { Rows, SqlClient } from '@/lib/db';

it('corrects a stored prototype and preserves the reviewed lifecycle through later imports', async () => {
  // An isolated in-memory database exercises the real upsert; it never opens the catalogue directory.
  const pg = new PGlite('memory://');
  try {
    await pg.exec(readFileSync('db/schema.sql', 'utf8'));
    const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.reduce((out, part, i) => out + part + (i < values.length ? `$${i + 1}` : ''), '');
      return (await pg.query(text, values)).rows as Rows;
    }) as SqlClient;
    sql.query = async (text, params) => (await pg.query(text, params)).rows as Rows;
    const subject = { manufacturerSlug: 'limx-dynamics', modelSlug: 'tron-2', status: 'prototype' as const };
    const id = await ensureRobot(sql, subject);
    await pg.query("update robots set status = 'prototype' where id = $1", [id]);
    await ensureRobot(sql, subject);
    expect((await pg.query('select status from robots where id = $1', [id])).rows).toEqual([{ status: 'shipping' }]);
    await ensureRobot(sql, { ...subject, status: 'unknown' });
    expect((await pg.query('select status from robots where id = $1', [id])).rows).toEqual([{ status: 'shipping' }]);
    expect(reviewedRobotStatus('limx-dynamics', 'tron-2', 'unreviewed-kit')).toBeNull();
    expect(reviewedRobotStatus('limx-dynamics', 'cl-1')).toBeNull();
  } finally { await pg.close(); }
}, 15000);
