import { getSql } from '@/lib/db';
import type { RobotCard } from '@/lib/spec/types';
import { canonicalManufacturerSlug, isPublicManufacturer, manufacturerAliases, manufacturerDisplayName, manufacturerLogo, manufacturerReview, type ManufacturerLogo, type ManufacturerReview } from '@/lib/manufacturers';
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
  review: ManufacturerReview | null;
  logo: ManufacturerLogo | null;
};

async function groupedManufacturers(): Promise<ManufacturerRow[]> {
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
    having count(r.id) > 0`;
  const grouped = new Map<string, ManufacturerRow>();
  // Group aliases for browsing while preserving their robot URLs and source history.
  for (const row of rows as ManufacturerRow[]) {
    const slug = canonicalManufacturerSlug(row.slug);
    const existing = grouped.get(slug);
    if (existing) {
      for (const key of ['robots', 'models', 'humanoids', 'quadrupeds', 'verified_values'] as const) existing[key] += Number(row[key]);
      if (row.slug === slug) existing.id = row.id;
      existing.country ??= row.country;
      continue;
    }
    const review = manufacturerReview(slug);
    grouped.set(slug, { ...row, slug, name: manufacturerDisplayName(slug, row.name), website_url: review?.website ?? row.website_url, review, logo: manufacturerLogo(slug) });
  }
  return [...grouped.values()].sort((a, b) => b.robots - a.robots || a.name.localeCompare(b.name));
}

export async function listManufacturers(): Promise<ManufacturerRow[]> {
  return (await groupedManufacturers()).filter((m) => isPublicManufacturer(m.slug));
}

export async function getManufacturer(slug: string): Promise<{ manufacturer: ManufacturerRow; robots: RobotCard[] } | null> {
  const canonical = canonicalManufacturerSlug(slug);
  const manufacturer = (await groupedManufacturers()).find((m) => m.slug === canonical);
  if (!manufacturer) return null;
  const sql = await getSql();
  const robots = coerceRows<RobotCard>(await sql.query(
    'select * from robot_cards where manufacturer_slug = any($1::text[]) order by name, variant',
    [manufacturerAliases(canonical)],
  ));
  return { manufacturer, robots };
}
