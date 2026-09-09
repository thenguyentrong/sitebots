-- sitebots schema.
--
-- Idempotent on purpose: every statement is create-if-not-exists so the same
-- file runs unchanged against Neon (scripts/migrate.mjs) and against the
-- in-process PGlite (lib/db.local.ts). Additive changes go at the END of the
-- file as `alter table … add column if not exists`; never edit a create block
-- in place, the databases that already exist would silently miss it.
--
-- Shape: an append-only fact ledger with provenance (robot_facts,
-- price_observations, availability_observations), plus a typed projection
-- (robot_current, price_current, availability_current) that the merge step in
-- lib/ingest/current.ts rebuilds. The site reads the projection only.


-- Where a value came from. `tier` is the precedence used when sources
-- disagree: 0 curated by us with evidence, 1 manufacturer domain, 2 distributor
-- listing, 3 aggregator database, 4 press estimate. `trust = 'deny'` rows are
-- the AI-content farms that cite each other; the fetch layer refuses them.
create table if not exists sources (
  id text primary key,
  name text not null,
  domain text not null unique,
  kind text not null check (kind in ('curated', 'manufacturer', 'distributor', 'aggregator', 'index')),
  tier smallint not null check (tier between 0 and 4),
  trust text not null default 'normal' check (trust in ('high', 'normal', 'medium', 'low', 'deny')),
  attribution_text text,
  homepage_url text,
  robots_note text,
  blocked_at timestamptz,
  last_fetched_at timestamptz,
  notes text
);

create table if not exists manufacturers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country char(2),
  website_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists manufacturer_aliases (
  alias text primary key,
  manufacturer_id uuid not null references manufacturers(id) on delete cascade
);

-- `variant` is part of the identity, not an attribute. A Unitree G1 base
-- ($13,500, no hands) and a G1 EDU (Jetson, Dex3 hands, quote only) are
-- different products that share a name, and every aggregator that merged them
-- produced a record that describes neither.
create table if not exists robots (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references manufacturers(id) on delete cascade,
  model_slug text not null,
  variant text not null default 'base',
  name text not null,
  form_factor text not null check (form_factor in ('humanoid', 'quadruped', 'mobile_manipulator')),
  status text not null default 'unknown'
    check (status in ('concept', 'prototype', 'pre_order', 'shipping', 'discontinued', 'unknown')),
  release_year smallint,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manufacturer_id, model_slug, variant)
);

-- Aliases are scoped to a manufacturer because model names collide across
-- vendors: Unitree G1 vs Galbot G1, Unitree A2 vs AgiBot A2.
create table if not exists robot_aliases (
  manufacturer_id uuid not null references manufacturers(id) on delete cascade,
  alias text not null,
  robot_id uuid not null references robots(id) on delete cascade,
  primary key (manufacturer_id, alias)
);

create table if not exists scrape_runs (
  id uuid primary key default gen_random_uuid(),
  adapter text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'ok', 'partial', 'failed')),
  fetched integer not null default 0,
  cached integer not null default 0,
  parsed integer not null default 0,
  facts integer not null default 0,
  errors jsonb not null default '[]',
  args jsonb,
  git_sha text,
  host text
);

-- The raw body of every page we parsed, so parsing can be re-run offline when
-- an adapter is fixed, without hitting the source again. The body itself goes
-- to Blob when a token is configured; the row keeps the hash either way.
create table if not exists raw_snapshots (
  id bigserial primary key,
  run_id uuid references scrape_runs(id) on delete set null,
  source_id text references sources(id),
  url text not null,
  fetched_at timestamptz not null default now(),
  http_status integer,
  content_type text,
  etag text,
  last_modified text,
  sha256 text not null,
  bytes integer not null,
  blob_url text,
  unique (url, sha256)
);

-- One row per (robot, field, qualifier, value, source). `qualifier` carries
-- the measurement variant that makes the value comparable: payload rated vs
-- peak vs carried while walking, runtime idle vs loaded. `fact_hash` excludes
-- observed_at, so a re-scrape that sees the same value refreshes the date
-- instead of duplicating the row; a changed value gets a new row and the old
-- one stays as history.
create table if not exists robot_facts (
  id bigserial primary key,
  robot_id uuid not null references robots(id) on delete cascade,
  field text not null,
  qualifier text,
  value_num numeric,
  value_min numeric,
  value_max numeric,
  value_text text,
  value_bool boolean,
  value_json jsonb,
  unit text,
  raw_value text,
  raw_unit text,
  source_id text references sources(id),
  source_url text not null,
  evidence_url text,
  source_tier smallint not null,
  observed_at timestamptz not null default now(),
  snapshot_id bigint references raw_snapshots(id) on delete set null,
  run_id uuid references scrape_runs(id) on delete set null,
  confidence real not null default 0.5,
  note text,
  fact_hash text not null,
  created_at timestamptz not null default now(),
  unique (robot_id, fact_hash)
);

create index if not exists robot_facts_lookup on robot_facts (robot_id, field, qualifier, observed_at desc);
create index if not exists robot_facts_source on robot_facts (source_id, observed_at desc);

-- Never store a bare number. A G1 is $13,500 in the US store and EUR 23,000 at
-- a German distributor; a price without region, tier, config and date is
-- misinformation with decimals.
create table if not exists price_observations (
  id bigserial primary key,
  robot_id uuid not null references robots(id) on delete cascade,
  amount numeric(12, 2) not null,
  currency char(3) not null,
  region text not null check (region in ('US', 'EU', 'DE', 'FR', 'UK', 'CN', 'GLOBAL')),
  tier smallint not null check (tier between 1 and 3),
  direct boolean not null default false,
  config text not null default 'base',
  includes_vat boolean,
  sku text,
  source_id text references sources(id),
  source_url text not null,
  evidence_url text,
  observed_at timestamptz not null default now(),
  -- A timestamptz→date cast is not immutable (it depends on the session time
  -- zone), so it cannot sit in a unique index. The stored column fixes the
  -- zone to UTC and gives the daily de-duplication something indexable.
  observed_day date generated always as ((observed_at at time zone 'UTC')::date) stored,
  snapshot_id bigint references raw_snapshots(id) on delete set null,
  run_id uuid references scrape_runs(id) on delete set null,
  note text
);

create unique index if not exists price_observations_daily
  on price_observations (robot_id, source_url, region, config, amount, currency, observed_day);
create index if not exists price_observations_lookup on price_observations (robot_id, region, observed_at desc);

create table if not exists availability_observations (
  id bigserial primary key,
  robot_id uuid not null references robots(id) on delete cascade,
  region text not null check (region in ('US', 'EU', 'DE', 'FR', 'UK', 'CN', 'GLOBAL')),
  status text not null
    check (status in ('for_sale', 'pre_order', 'enterprise_only', 'not_sold', 'discontinued', 'unknown')),
  in_stock boolean,
  lead_time_days_min integer,
  lead_time_days_max integer,
  lead_time_text text,
  source_id text references sources(id),
  source_url text not null,
  observed_at timestamptz not null default now(),
  observed_day date generated always as ((observed_at at time zone 'UTC')::date) stored,
  run_id uuid references scrape_runs(id) on delete set null
);

create unique index if not exists availability_observations_daily
  on availability_observations (robot_id, source_url, region, status, observed_day);
create index if not exists availability_observations_lookup
  on availability_observations (robot_id, region, observed_at desc);

-- The construction layer. No public source publishes IP rating, operating
-- temperature, stair capability or certifications for humanoids, so these are
-- authored by us in data/curated/*.yaml with a confidence and a note, loaded
-- here, and mirrored into robot_facts as tier 0.
create table if not exists curated_entries (
  robot_id uuid not null references robots(id) on delete cascade,
  field text not null,
  qualifier text,
  value_json jsonb,
  confidence text not null check (confidence in ('confirmed', 'likely', 'assumed')),
  note text,
  evidence_url text,
  author text,
  file_path text,
  updated_at timestamptz not null default now()
);

create unique index if not exists curated_entries_key
  on curated_entries (robot_id, field, coalesce(qualifier, ''));

create table if not exists robot_assets (
  id uuid primary key default gen_random_uuid(),
  robot_id uuid not null references robots(id) on delete cascade,
  kind text not null check (kind in ('image', 'hero', 'logo', 'model_glb', 'datasheet_pdf')),
  url text not null,
  source_url text,
  licence text,
  attribution text,
  width integer,
  height integer,
  alt text,
  is_primary boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists robot_assets_lookup on robot_assets (robot_id, kind, is_primary desc, sort);

-- Typed projection for the matcher and the pages. Rebuilt per robot by
-- lib/ingest/current.ts from the ledger; `specs` holds every field with its
-- provenance and trust label so a page can show where a number came from
-- without a second query.
create table if not exists robot_current (
  robot_id uuid primary key references robots(id) on delete cascade,
  height_m numeric,
  height_min_m numeric,
  height_max_m numeric,
  weight_kg numeric,
  payload_kg_conservative numeric,
  payload_kg_rated numeric,
  payload_kg_peak numeric,
  reach_m numeric,
  dof_total smallint,
  dof_body smallint,
  dof_arms smallint,
  dof_legs smallint,
  dof_hands smallint,
  walk_speed_ms numeric,
  max_speed_ms numeric,
  battery_wh numeric,
  runtime_h numeric,
  runtime_basis text,
  hot_swap boolean,
  charge_time_h numeric,
  compute_module text,
  compute_tops numeric,
  ip_rating text,
  ip_solid smallint,
  ip_liquid smallint,
  temp_min_c numeric,
  temp_max_c numeric,
  stair_capable boolean,
  max_slope_deg numeric,
  step_height_m numeric,
  outdoor_rated boolean,
  noise_db numeric,
  certifications text[] not null default '{}',
  task_capabilities text[] not null default '{}',
  requires_operator text,
  trl smallint,
  specs jsonb not null default '{}',
  conflicts jsonb not null default '[]',
  verified_fields text[] not null default '{}',
  completeness real not null default 0,
  built_at timestamptz not null default now(),
  built_from_run uuid
);

create table if not exists price_current (
  robot_id uuid not null references robots(id) on delete cascade,
  region text not null,
  config text not null default 'base',
  amount numeric(12, 2) not null,
  currency char(3) not null,
  tier smallint not null,
  direct boolean not null default false,
  includes_vat boolean,
  source_id text,
  source_url text not null,
  observed_at timestamptz not null,
  stale boolean not null default false,
  primary key (robot_id, region, config)
);

create table if not exists availability_current (
  robot_id uuid not null references robots(id) on delete cascade,
  region text not null,
  status text not null,
  in_stock boolean,
  lead_time_days_min integer,
  lead_time_days_max integer,
  lead_time_text text,
  source_url text not null,
  observed_at timestamptz not null,
  primary key (robot_id, region)
);

create table if not exists parse_cache (
  hash text primary key,
  prompt_version text not null,
  model text not null,
  input_text text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id smallint primary key default 1 check (id = 1),
  usd_to_eur numeric not null default 0.92,
  updated_at timestamptz not null default now()
);

insert into settings (id) values (1) on conflict (id) do nothing;

create table if not exists ai_usage (
  id bigserial primary key,
  ts timestamptz not null default now(),
  operation text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  est_cost_usd numeric(12, 6) not null default 0
);
