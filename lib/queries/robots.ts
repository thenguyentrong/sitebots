import { getSql } from '@/lib/db';
import type { FormFactor } from '@/lib/spec/enums';
import type { AvailabilityCurrent, PriceCurrent, RobotCard, RobotSource, SpecConflict } from '@/lib/spec/types';
import { coerceRows } from './coerce';

/** `pictures: 'with'` (the default) lists only robots that have a real picture — a render of the maker's geometry, a photograph or the maker's own preview. */
export type CardFilter = { formFactor?: FormFactor; q?: string; limit?: number; pictures?: 'with' | 'all' };

/**
 * Cards for the catalogue grid. Best-documented robots first: verified values,
 * then completeness, then name — so the page opens on robots with evidence
 * rather than on the alphabet.
 */
export async function listRobotCards(filter: CardFilter = {}): Promise<{ robots: RobotCard[]; total: number; hidden: number }> {
  const sql = await getSql();
  const q = filter.q?.trim() ? `%${filter.q.trim().replace(/[%_]/g, '')}%` : null;
  const all = filter.pictures === 'all';
  const rows = await sql.query(
    `select *, count(*) over () as total_count from robot_cards
     where ($1::text is null or form_factor = $1)
       and ($2::text is null or name ilike $2 or manufacturer_name ilike $2 or model_slug ilike $2)
       and ($4::boolean or image_url is not null)
     order by coalesce(array_length(verified_fields, 1), 0) desc, completeness desc, manufacturer_name, name, variant
     limit $3`,
    [filter.formFactor ?? null, q, filter.limit ?? 1000, all],
  );
  const total = rows.length ? Number(rows[0].total_count) : 0;
  // How many the picture rule keeps off the page, so the page can say so instead of silently shrinking.
  const hiddenRows = all
    ? []
    : await sql.query(
        `select count(*)::int as n from robot_cards
         where ($1::text is null or form_factor = $1)
           and ($2::text is null or name ilike $2 or manufacturer_name ilike $2 or model_slug ilike $2)
           and image_url is null`,
        [filter.formFactor ?? null, q],
      );
  const hidden = hiddenRows.length ? Number(hiddenRows[0].n) : 0;
  return { robots: coerceRows<RobotCard>(rows), total, hidden };
}

export type RobotVariant = { id: string; variant: string; name: string };

export type RobotImage = { url: string; alt: string | null; licence: string | null; attribution: string | null; source_url: string | null; width: number | null; height: number | null; kind: 'render' | 'photo' | 'preview'; own: boolean };

export type RobotDetail = {
  robot: RobotCard;
  /** First picture by precedence, for JSON-LD and the card. */
  image: RobotImage | null;
  /** Every picture the gallery can show: the maker's own pictures first, then free-licence photographs, then render stills; a variant borrows the base model's photographs and previews. */
  images: RobotImage[];
  variants: RobotVariant[];
  prices: PriceCurrent[];
  availability: AvailabilityCurrent[];
  sources: RobotSource[];
  conflicts: SpecConflict[];
};

/**
 * One model page shows all its variants as tabs; the URL names the model and
 * `variant` picks the tab. Falls back to the first variant when the requested
 * one does not exist, so a stale link still lands on the model.
 */
export async function getRobotDetail(
  manufacturerSlug: string,
  modelSlug: string,
  variant?: string,
): Promise<RobotDetail | null> {
  const sql = await getSql();
  const cards = coerceRows<RobotCard>(
    await sql`select * from robot_cards where manufacturer_slug = ${manufacturerSlug} and model_slug = ${modelSlug}
              order by case variant when 'base' then 0 else 1 end, variant`,
  );
  if (!cards.length) return null;
  const robot = cards.find((c) => c.variant === variant) ?? cards[0];

  const [prices, availability, sources, current, images] = await Promise.all([
    sql`select * from price_current where robot_id = ${robot.id}
        order by case region when 'DE' then 0 when 'EU' then 1 when 'GLOBAL' then 2 when 'US' then 3 else 4 end, config`,
    sql`select * from availability_current where robot_id = ${robot.id} order by region`,
    sql`select rs.source_id, rs.source_url, rs.observed_at, rs.facts, s.name, s.kind, s.tier, s.attribution_text
        from robot_sources rs left join sources s on s.id = rs.source_id
        where rs.robot_id = ${robot.id} order by s.tier nulls last, rs.source_url`,
    sql`select conflicts from robot_current where robot_id = ${robot.id}`,
    sql`select a.url, a.alt, a.licence, a.attribution, a.source_url, a.width, a.height, (a.robot_id = ${robot.id}) as own,
               case when a.url like '/renders/%' then 'render'
                    when a.licence = 'maker-preview' or a.licence in ('BSD-3-Clause', 'BSD-2-Clause', 'MIT', 'Apache-2.0') then 'preview'
                    else 'photo' end as kind
        from robot_assets a
        where a.kind in ('hero', 'image')
          and (a.robot_id = ${robot.id}
               or (${robot.variant} <> 'base' and a.url not like '/renders/%'
                   and a.robot_id = (select b.id from robots b join manufacturers m on m.id = b.manufacturer_id
                                     where m.slug = ${manufacturerSlug} and b.model_slug = ${modelSlug} and b.variant = 'base')))
        order by (a.robot_id = ${robot.id}) desc,
                 case when a.url like '/renders/%' then 0
                      when a.licence = 'maker-preview' or a.licence in ('BSD-3-Clause', 'BSD-2-Clause', 'MIT', 'Apache-2.0') then 1
                      else 2 end,
                 a.is_primary desc, a.sort asc`,
  ]);

  const conflictsRaw = (current[0]?.conflicts ?? []) as SpecConflict[] | string;
  const conflicts = typeof conflictsRaw === 'string' ? (JSON.parse(conflictsRaw) as SpecConflict[]) : conflictsRaw;

  return {
    robot,
    image: (coerceRows<RobotImage>(images)[0] as RobotImage | undefined) ?? null,
    images: coerceRows<RobotImage>(images),
    variants: cards.map((c) => ({ id: c.id, variant: c.variant, name: c.name })),
    prices: coerceRows<PriceCurrent>(prices),
    availability: coerceRows<AvailabilityCurrent>(availability),
    sources: coerceRows<RobotSource>(sources),
    conflicts,
  };
}

export async function listRobotPaths(): Promise<{ manufacturer: string; slug: string; updated: string }[]> {
  const sql = await getSql();
  const rows = await sql`
    select m.slug as manufacturer, r.model_slug as slug, max(coalesce(rc.built_at, r.updated_at)) as updated
    from robots r join manufacturers m on m.id = r.manufacturer_id
    left join robot_current rc on rc.robot_id = r.id
    group by m.slug, r.model_slug order by m.slug, r.model_slug`;
  return rows.map((r) => ({
    manufacturer: String(r.manufacturer),
    slug: String(r.slug),
    updated: r.updated instanceof Date ? r.updated.toISOString() : String(r.updated),
  }));
}
