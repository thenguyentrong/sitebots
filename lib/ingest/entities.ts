import type { SqlClient } from '@/lib/db';
import type { FormFactor, RobotStatus } from '@/lib/spec/enums';
import { manufacturerAlias, robotAlias } from './aliases';

/**
 * Manufacturer and robot rows are created from data/aliases.yaml, never from
 * a scraped string. A scraper can only attach facts to a robot that already
 * has an identity here; anything it cannot resolve is quarantined.
 */

export async function ensureManufacturer(sql: SqlClient, slug: string): Promise<string> {
  const m = manufacturerAlias(slug);
  const [row] = (await sql`
    insert into manufacturers (slug, name, country, website_url)
    values (${slug}, ${m.name}, ${m.country ?? null}, ${m.website ?? null})
    on conflict (slug) do update set
      name = excluded.name,
      country = coalesce(excluded.country, manufacturers.country),
      website_url = coalesce(excluded.website_url, manufacturers.website_url),
      updated_at = now()
    returning id`) as { id: string }[];
  const id = row?.id ?? (await manufacturerId(sql, slug));
  for (const alias of [m.name, ...m.aliases]) {
    await sql`insert into manufacturer_aliases (alias, manufacturer_id) values (${alias.toLowerCase()}, ${id})
              on conflict (alias) do update set manufacturer_id = excluded.manufacturer_id`;
  }
  return id;
}

export async function manufacturerId(sql: SqlClient, slug: string): Promise<string> {
  const [row] = (await sql`select id from manufacturers where slug = ${slug}`) as { id: string }[];
  if (!row) throw new Error(`manufacturer ${slug} not in database (dry run?)`);
  return row.id;
}

export type EnsureRobot = {
  manufacturerSlug: string;
  modelSlug: string;
  variant?: string;
  name?: string;
  formFactor?: FormFactor;
  status?: RobotStatus;
  releaseYear?: number | null;
  summary?: string | null;
};

export async function ensureRobot(sql: SqlClient, r: EnsureRobot): Promise<string> {
  const alias = robotAlias(r.manufacturerSlug, r.modelSlug);
  const manufacturerId = await ensureManufacturer(sql, r.manufacturerSlug);
  const variant = r.variant ?? 'base';
  const name = r.name ?? variantName(alias.name, variant);
  const [row] = (await sql`
    insert into robots (manufacturer_id, model_slug, variant, name, form_factor, status, release_year, summary)
    values (${manufacturerId}, ${r.modelSlug}, ${variant}, ${name}, ${r.formFactor ?? alias.form_factor},
            ${r.status ?? 'unknown'}, ${r.releaseYear ?? null}, ${r.summary ?? null})
    on conflict (manufacturer_id, model_slug, variant) do update set
      name = excluded.name,
      form_factor = excluded.form_factor,
      status = case when robots.status = 'unknown' then excluded.status else robots.status end,
      release_year = coalesce(robots.release_year, excluded.release_year),
      summary = coalesce(robots.summary, excluded.summary),
      updated_at = now()
    returning id`) as { id: string }[];
  const id = row?.id ?? (await robotId(sql, manufacturerId, r.modelSlug, variant));
  for (const a of [alias.name, ...alias.aliases]) {
    await sql`insert into robot_aliases (manufacturer_id, alias, robot_id) values (${manufacturerId}, ${a.toLowerCase()}, ${id})
              on conflict (manufacturer_id, alias) do nothing`;
  }
  return id;
}

export async function robotId(sql: SqlClient, manufacturerId: string, modelSlug: string, variant: string): Promise<string> {
  const [row] = (await sql`select id from robots where manufacturer_id = ${manufacturerId} and model_slug = ${modelSlug} and variant = ${variant}`) as { id: string }[];
  if (!row) throw new Error(`robot ${modelSlug}/${variant} not in database (dry run?)`);
  return row.id;
}

const VARIANT_WORDS: Record<string, string> = { edu: 'EDU', pro: 'Pro', air: 'Air', plus: 'Plus', arm: 'Arm' };

/** "edu" → "EDU", "w" → "W", "plus" → "Plus", "x30-pro" → "X30-Pro". */
export function variantLabel(variant: string): string {
  if (variant === 'base') return '';
  if (VARIANT_WORDS[variant]) return VARIANT_WORDS[variant];
  if (/^[a-z]$/.test(variant)) return variant.toUpperCase();
  return variant.replace(/(^|-)([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase());
}

/** Unitree writes "B2-W" and "R1-D" but "G1 EDU" and "H2 Plus": single letters hyphenate, words get a space. */
export function variantName(baseName: string, variant: string): string {
  const label = variantLabel(variant);
  if (!label) return baseName;
  return /^[A-Z]$/.test(label) ? `${baseName}-${label}` : `${baseName} ${label}`;
}
