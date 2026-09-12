import { getSql } from '@/lib/db';
import { canonicalManufacturerSlug, publicManufacturerSlugs } from '@/lib/manufacturers';

export type SiteStats = { robots: number; makers: number; verified: number; prices: number };

/** Homepage counts describe the same reviewed supplier catalogue as browsing and matching. */
export async function getSiteStats(): Promise<SiteStats> {
  const sql = await getSql();
  const rows = await sql.query(`
    select m.slug, count(r.id)::int as robots,
           coalesce(sum(coalesce(array_length(rc.verified_fields, 1), 0)), 0)::int as verified,
           coalesce(sum(p.n), 0)::int as prices
    from robots r join manufacturers m on m.id = r.manufacturer_id
    left join robot_current rc on rc.robot_id = r.id
    left join (select robot_id, count(*) as n from price_current group by robot_id) p on p.robot_id = r.id
    where m.slug = any($1::text[])
    group by m.slug`, [publicManufacturerSlugs()]);
  return {
    robots: rows.reduce((n, r) => n + Number(r.robots), 0),
    makers: new Set(rows.map((r) => canonicalManufacturerSlug(String(r.slug)))).size,
    verified: rows.reduce((n, r) => n + Number(r.verified), 0),
    prices: rows.reduce((n, r) => n + Number(r.prices), 0),
  };
}
