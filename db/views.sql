-- Read models for lists, compare and the matcher's candidate load. Plain views,
-- dropped and recreated on every migrate so they follow schema.sql: Postgres
-- refuses `create or replace` when a column is added anywhere but the end, and
-- a view holds no data, so there is nothing to preserve.

drop view if exists robot_cards;
drop view if exists robot_sources;

-- One row per robot variant with the projection columns the cards and the
-- matcher need, the primary image, and the single best price for an EU buyer.
-- A price somebody actually read on a store or a distributor page (tier 1–2)
-- always beats an aggregator's estimate, whatever the region; among those,
-- German listing first, then EU, then a global quote, then the US list price
-- (which the UI labels by region and tier, never as "the price").
create view robot_cards as
select
  r.id,
  r.model_slug,
  r.variant,
  r.name,
  r.form_factor,
  r.status,
  r.release_year,
  r.summary,
  m.id as manufacturer_id,
  m.slug as manufacturer_slug,
  m.name as manufacturer_name,
  m.country as manufacturer_country,
  rc.height_m,
  rc.height_min_m,
  rc.height_max_m,
  rc.weight_kg,
  rc.payload_kg_conservative,
  rc.payload_kg_rated,
  rc.payload_kg_peak,
  rc.reach_m,
  rc.dof_total,
  rc.walk_speed_ms,
  rc.max_speed_ms,
  rc.runtime_h,
  rc.runtime_basis,
  rc.hot_swap,
  rc.ip_rating,
  rc.ip_solid,
  rc.ip_liquid,
  rc.temp_min_c,
  rc.temp_max_c,
  rc.stair_capable,
  rc.max_slope_deg,
  rc.step_height_m,
  rc.outdoor_rated,
  rc.noise_db,
  rc.certifications,
  rc.task_capabilities,
  rc.requires_operator,
  rc.trl,
  rc.specs,
  rc.verified_fields,
  rc.completeness,
  a.url as image_url,
  a.alt as image_alt,
  p.amount as price_amount,
  p.currency as price_currency,
  p.region as price_region,
  p.tier as price_tier,
  p.direct as price_direct,
  p.observed_at as price_observed_at,
  p.stale as price_stale,
  p.source_url as price_source_url
from robots r
join manufacturers m on m.id = r.manufacturer_id
left join robot_current rc on rc.robot_id = r.id
-- Card picture: the robot's own render first (the site's default view), then
-- the maker's own pictures, then a free-licence photograph. A variant without pictures of its
-- own borrows the base model's photograph and preview — the same product —
-- but never the base render, which may be a different body (B2 vs B2-W).
left join lateral (
  select a.url, a.alt from robot_assets a
  where a.kind in ('hero', 'image')
    and (a.robot_id = r.id
         or (r.variant <> 'base' and a.url not like '/renders/%' and a.robot_id = (
               select b.id from robots b
               where b.manufacturer_id = r.manufacturer_id and b.model_slug = r.model_slug and b.variant = 'base')))
  order by (a.robot_id = r.id) desc,
           case when a.url like '/renders/%' then 0
                when a.licence = 'maker-preview' or a.licence in ('BSD-3-Clause', 'BSD-2-Clause', 'MIT', 'Apache-2.0') then 1
                else 2 end,
           a.is_primary desc, a.sort asc
  limit 1
) a on true
left join lateral (
  select * from price_current
  where robot_id = r.id
  order by
    case when tier <= 2 then 0 else 1 end,
    case region when 'DE' then 0 when 'EU' then 1 when 'GLOBAL' then 2 when 'US' then 3 else 4 end,
    case when config = 'base' then 0 else 1 end,
    tier asc,
    amount asc,
    observed_at desc
  limit 1
) p on true;

-- Every source that contributed to a robot, for the attribution block.
create view robot_sources as
select robot_id, source_id, source_url, max(observed_at) as observed_at, count(*) as facts
from (
  select robot_id, source_id, source_url, observed_at from robot_facts
  union all
  select robot_id, source_id, source_url, observed_at from price_observations
  union all
  select robot_id, source_id, source_url, observed_at from availability_observations
) u
group by robot_id, source_id, source_url;
