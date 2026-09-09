import { getSql } from '@/lib/db';
import type { RobotCard } from '@/lib/spec/types';
import { coerceRows } from './coerce';

export type ManufacturerRow = {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  website_url: string | null;
  description: string | null;
  robots: number;
  models: number;
  humanoids: number;
  quadrupeds: number;
  verified_values: number;
};

export async function listManufacturers(): Promise<ManufacturerRow[]> {
  const sql = await getSql();
  const rows = await sql`
    select m.id, m.slug, m.name, m.country, m.website_url, m.description,
           count(r.id)::int as robots,
           count(distinct r.model_slug)::int as models,
           count(r.id) filter (where r.form_factor = 'humanoid')::int as humanoids,
           count(r.id) filter (where r.form_factor = 'quadruped')::int as quadrupeds,
           coalesce(sum(coalesce(array_length(rc.verified_fields, 1), 0)), 0)::int as verified_values
    from manufacturers m
    left join robots r on r.manufacturer_id = m.id
    left join robot_current rc on rc.robot_id = r.id
    group by m.id
    having count(r.id) > 0
    order by count(r.id) desc, m.name`;
  return rows as ManufacturerRow[];
}

export async function getManufacturer(slug: string): Promise<{ manufacturer: ManufacturerRow; robots: RobotCard[] } | null> {
  const sql = await getSql();
  const [m] = (await sql`
    select m.id, m.slug, m.name, m.country, m.website_url, m.description,
           (select count(*) from robots r where r.manufacturer_id = m.id)::int as robots,
           (select count(distinct model_slug) from robots r where r.manufacturer_id = m.id)::int as models,
           (select count(*) from robots r where r.manufacturer_id = m.id and form_factor = 'humanoid')::int as humanoids,
           (select count(*) from robots r where r.manufacturer_id = m.id and form_factor = 'quadruped')::int as quadrupeds,
           0 as verified_values
    from manufacturers m where m.slug = ${slug}`) as ManufacturerRow[];
  if (!m) return null;
  const robots = coerceRows<RobotCard>(
    await sql`select * from robot_cards where manufacturer_slug = ${slug} order by name, variant`,
  );
  return { manufacturer: m, robots };
}
