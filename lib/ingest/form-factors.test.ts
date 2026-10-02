import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';
import { FORM_FACTORS } from '@/lib/spec/enums';

it('expands the SQL class constraint idempotently without merging existing variants', async () => {
  const pg = new PGlite('memory://');
  try {
    const schema = readFileSync('db/schema.sql', 'utf8');
    const beforeExpansion = schema.split('-- Expand platform classification')[0];
    await pg.exec(beforeExpansion);
    const maker = '00000000-0000-4000-8000-000000000001';
    await pg.query('insert into manufacturers (id, slug, name) values ($1, $2, $3)', [maker, 'test', 'Synthetic test']);
    for (const variant of ['base', 'edu']) await pg.query('insert into robots (manufacturer_id, model_slug, variant, name, form_factor) values ($1,$2,$3,$4,$5)', [maker, 'legacy', variant, 'Legacy', 'humanoid']);
    const before = (await pg.query('select id, model_slug, variant from robots order by variant')).rows;
    await pg.exec(schema);
    for (const form of FORM_FACTORS.slice(3)) {
      await pg.query('insert into robots (manufacturer_id, model_slug, variant, name, form_factor) values ($1,$2,$3,$4,$5)', [maker, form, 'base', form, form]);
    }
    await pg.exec(schema);
    await pg.exec(readFileSync('db/views.sql', 'utf8'));
    expect((await pg.query("select id, model_slug, variant from robots where model_slug='legacy' order by variant")).rows).toEqual(before);
    expect((await pg.query<{ form_factor: string }>("select form_factor from robot_cards where model_slug <> 'legacy' order by form_factor")).rows.map((row) => row.form_factor)).toEqual([...FORM_FACTORS.slice(3)].sort());
    await expect(pg.query('insert into robots (manufacturer_id, model_slug, name, form_factor) values ($1,$2,$3,$4)', [maker, 'invalid', 'Invalid', 'anything'])).rejects.toThrow(/robots_form_factor_check/);
  } finally { await pg.close(); }
}, 15000);
