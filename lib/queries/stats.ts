import { getSql } from '@/lib/db';

export type SiteStats = { robots: number; makers: number; verified: number; prices: number };

/** The four numbers on the home page, straight from the projection tables. */
export async function getSiteStats(): Promise<SiteStats> {
  const sql = await getSql();
  const rows = await sql`
    select (select count(*) from robots)::int as robots,
           (select count(distinct manufacturer_id) from robots)::int as makers,
           (select coalesce(sum(coalesce(array_length(verified_fields, 1), 0)), 0) from robot_current)::int as verified,
           (select count(*) from price_current)::int as prices`;
  const r = rows[0] ?? {};
  return {
    robots: Number(r.robots ?? 0),
    makers: Number(r.makers ?? 0),
    verified: Number(r.verified ?? 0),
    prices: Number(r.prices ?? 0),
  };
}
