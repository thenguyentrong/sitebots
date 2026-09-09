// What the projection looks like right now.
//
//   npm run report                 summary: counts, coverage, trust, conflicts, top makers
//   npm run report -- --table      one line per robot (long once the aggregators are in)
//   npm run report -- --conflicts  robots whose sources disagree, with the values

import { db, done } from './_guard';

type Row = Record<string, unknown>;

async function main() {
  const sql = await db();
  const table = process.argv.includes('--table');
  const conflicts = process.argv.includes('--conflicts');

  if (table) {
    const rows = (await sql`
      select manufacturer_name, name, variant, height_m, weight_kg, payload_kg_conservative, runtime_h, ip_rating,
             price_amount, price_currency, price_region, price_tier,
             coalesce(array_length(verified_fields, 1), 0)::int as verified,
             (select count(*) from jsonb_object_keys(specs))::int as total
      from robot_cards order by manufacturer_name, name, variant`) as Row[];
    console.table(
      rows.map((r) => ({
        robot: `${r.manufacturer_name} ${r.name}${r.variant === 'base' ? '' : ' / ' + r.variant}`,
        height: r.height_m ?? '',
        kg: r.weight_kg ?? '',
        payload: r.payload_kg_conservative ?? '',
        runtime: r.runtime_h ?? '',
        ip: r.ip_rating ?? '',
        price: r.price_amount ? `${r.price_currency} ${r.price_amount} (${r.price_region}, t${r.price_tier})` : 'quote',
        verified: `${r.verified}/${r.total}`,
      })),
    );
    return;
  }

  if (conflicts) {
    const rows = (await sql`
      select m.name as maker, r.name, r.variant, rc.conflicts
      from robot_current rc join robots r on r.id = rc.robot_id join manufacturers m on m.id = r.manufacturer_id
      where jsonb_array_length(rc.conflicts) > 0 order by jsonb_array_length(rc.conflicts) desc, m.name, r.name`) as Row[];
    for (const r of rows) {
      const list = (typeof r.conflicts === 'string' ? JSON.parse(r.conflicts) : r.conflicts) as { key: string; values: { value: unknown; source_url: string; source_tier: number }[] }[];
      console.log(`\n${r.maker} ${r.name}${r.variant === 'base' ? '' : ' / ' + r.variant}`);
      for (const c of list) {
        console.log(`  ${c.key}: ${c.values.map((v) => `${JSON.stringify(v.value)} (t${v.source_tier} ${new URL(v.source_url).hostname.replace(/^www\./, '')})`).join(' vs ')}`);
      }
    }
    console.log(`\n${rows.length} robots with disagreeing sources`);
    return;
  }

  const one = async (text: string) => (await sql.query(text))[0] as Row;
  const all = async (text: string) => (await sql.query(text)) as Row[];
  const line = (label: string, v: unknown) => console.log(label.padEnd(30), typeof v === 'string' ? v : JSON.stringify(v));

  line('robots / models / makers', await one(`select count(*)::int as robots, count(distinct manufacturer_id || model_slug)::int as models, count(distinct manufacturer_id)::int as makers from robots`));
  line('form factor', (await all(`select form_factor, count(*)::int as n from robots group by 1 order by 2 desc`)).map((r) => `${r.form_factor} ${r.n}`).join(' · '));
  line('status', (await all(`select status, count(*)::int as n from robots group by 1 order by 2 desc`)).map((r) => `${r.status} ${r.n}`).join(' · '));
  line('ledger', await one(`select (select count(*) from robot_facts)::int as facts, (select count(*) from price_observations)::int as prices, (select count(*) from availability_observations)::int as availability, (select count(*) from raw_snapshots)::int as snapshots, (select count(*) from scrape_runs)::int as runs`));
  line('robots with a price', await one(`select count(distinct robot_id)::int as any_tier, count(distinct robot_id) filter (where tier <= 2)::int as store_or_distributor from price_current`));
  line('robots with verified values', await one(`select count(*)::int as n from robot_current where array_length(verified_fields, 1) > 0`));
  line('robots with conflicts', await one(`select count(*)::int as n from robot_current where jsonb_array_length(conflicts) > 0`));
  line('field coverage', await one(`select count(*) filter (where height_m is not null)::int as height, count(*) filter (where weight_kg is not null)::int as weight, count(*) filter (where payload_kg_conservative is not null)::int as payload, count(*) filter (where runtime_h is not null)::int as runtime, count(*) filter (where max_speed_ms is not null)::int as speed, count(*) filter (where dof_total is not null)::int as dof, count(*) filter (where ip_rating is not null)::int as ip, count(*) filter (where temp_min_c is not null)::int as temp, count(*) filter (where stair_capable is not null)::int as stairs, count(*) filter (where cardinality(certifications) > 0)::int as certs from robot_current`));
  line('trust of values', (await all(`select kv.value->>'trust' as t, count(*)::int as n from robot_current, jsonb_each(specs) kv group by 1 order by 2 desc`)).map((r) => `${r.t} ${r.n}`).join(' · '));
  line('top makers', (await all(`select m.name, count(*)::int as n from robots r join manufacturers m on m.id = r.manufacturer_id group by m.name order by 2 desc limit 10`)).map((r) => `${r.name} ${r.n}`).join(' · '));
  line('sources', (await all(`select coalesce(source_id, 'unregistered') as s, count(*)::int as n from robot_facts group by 1 order by 2 desc`)).map((r) => `${r.s} ${r.n}`).join(' · '));

  // Assets: what a visitor sees on a card, and who is still a glyph.
  console.log('\n== assets ==');
  line('robots with any image', await one(`select count(distinct robot_id)::int as n from robot_assets where kind in ('image','hero')`));
  line('by kind', (await all(`select case when licence = 'maker-preview' then 'maker preview' when url like '/renders/%' then 'render' else 'photograph' end as k, count(distinct robot_id)::int as n from robot_assets where kind in ('image','hero') group by 1 order by 2 desc`)).map((r) => `${r.k} ${r.n}`).join(' · '));
  line('by form factor', (await all(`select r.form_factor, count(distinct r.id)::int as n from robots r join robot_assets a on a.robot_id = r.id and a.kind in ('image','hero') group by 1 order by 2 desc`)).map((r) => `${r.form_factor} ${r.n}`).join(' · '));
  line('robots with actuator data', await one(`select count(*)::int as n from robot_current where specs ? 'actuators'`));
  line('robots with equipment options', await one(`select count(*)::int as n from robot_current where specs ? 'equipment_options'`));
  try {
    const { readFileSync } = await import('node:fs');
    const misses = JSON.parse(readFileSync('.out/review-previews/misses.json', 'utf8')) as Record<string, string[]>;
    const hosts = Object.entries(misses).sort((a, b) => b[1].length - a[1].length);
    line('makers with a site but no findable page', `${hosts.length} hosts / ${hosts.reduce((n, [, v]) => n + v.length, 0)} robots — top: ${hosts.slice(0, 8).map(([h, v]) => `${h} ${v.length}`).join(' · ')}`);
  } catch {
    line('makers with a site but no findable page', 'run scripts/assets/maker-previews.ts --review first');
  }
}

main()
  .then(() => done(0))
  .catch((e) => {
    console.error(e);
    return done(1);
  });
