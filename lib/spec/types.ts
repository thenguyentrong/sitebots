import type { AvailabilityStatus, FormFactor, Region, RobotStatus, Trust } from './enums';

export type ScalarValue = number | string | boolean | string[] | Record<string, unknown> | null;

/** One field in robot_current.specs — the winning fact plus where it came from. */
export type SpecValue = {
  value: ScalarValue;
  min?: number | null;
  max?: number | null;
  unit?: string | null;
  raw?: string | null;
  source_id?: string | null;
  source_url: string;
  evidence_url?: string | null;
  source_tier: number;
  observed_at: string;
  confidence: number;
  trust: Trust;
  note?: string | null;
};

export type Specs = Record<string, SpecValue>;

export type SpecConflict = {
  key: string;
  values: { value: ScalarValue; source_url: string; source_tier: number; observed_at: string }[];
};

/** A fact after normalisation, ready for robot_facts. All values in canonical units. */
export type NormalizedFact = {
  field: string;
  qualifier?: string | null;
  value_num?: number | null;
  value_min?: number | null;
  value_max?: number | null;
  value_text?: string | null;
  value_bool?: boolean | null;
  value_json?: unknown;
  unit?: string | null;
  raw_value?: string | null;
  raw_unit?: string | null;
  source_id?: string | null;
  source_url: string;
  evidence_url?: string | null;
  source_tier: number;
  observed_at: string;
  confidence: number;
  note?: string | null;
  snapshot_id?: number | null;
  run_id?: string | null;
};

export type NormalizedPrice = {
  amount: number;
  currency: string;
  region: Region;
  tier: 1 | 2 | 3;
  direct: boolean;
  config: string;
  includes_vat?: boolean | null;
  sku?: string | null;
  source_id?: string | null;
  source_url: string;
  evidence_url?: string | null;
  observed_at: string;
  note?: string | null;
  snapshot_id?: number | null;
  run_id?: string | null;
};

export type NormalizedAvailability = {
  region: Region;
  status: AvailabilityStatus;
  in_stock?: boolean | null;
  lead_time_days_min?: number | null;
  lead_time_days_max?: number | null;
  lead_time_text?: string | null;
  source_id?: string | null;
  source_url: string;
  observed_at: string;
  run_id?: string | null;
};

export type RobotCard = {
  id: string;
  model_slug: string;
  variant: string;
  name: string;
  form_factor: FormFactor;
  status: RobotStatus;
  release_year: number | null;
  summary: string | null;
  manufacturer_id: string;
  manufacturer_slug: string;
  manufacturer_name: string;
  manufacturer_country: string | null;
  height_m: number | null;
  height_min_m: number | null;
  height_max_m: number | null;
  weight_kg: number | null;
  payload_kg_conservative: number | null;
  payload_kg_rated: number | null;
  payload_kg_peak: number | null;
  reach_m: number | null;
  dof_total: number | null;
  walk_speed_ms: number | null;
  max_speed_ms: number | null;
  runtime_h: number | null;
  runtime_basis: string | null;
  hot_swap: boolean | null;
  ip_rating: string | null;
  ip_solid: number | null;
  ip_liquid: number | null;
  temp_min_c: number | null;
  temp_max_c: number | null;
  stair_capable: boolean | null;
  max_slope_deg: number | null;
  step_height_m: number | null;
  outdoor_rated: boolean | null;
  noise_db: number | null;
  certifications: string[];
  task_capabilities: string[];
  requires_operator: string | null;
  trl: number | null;
  specs: Specs;
  verified_fields: string[];
  completeness: number;
  image_url: string | null;
  image_alt: string | null;
  price_amount: number | null;
  price_currency: string | null;
  price_region: Region | null;
  price_tier: number | null;
  price_direct: boolean | null;
  price_observed_at: string | null;
  price_stale: boolean | null;
  price_source_url: string | null;
};

export type PriceCurrent = {
  robot_id: string;
  region: Region;
  config: string;
  amount: number;
  currency: string;
  tier: number;
  direct: boolean;
  includes_vat: boolean | null;
  source_id: string | null;
  source_url: string;
  observed_at: string;
  stale: boolean;
};

export type AvailabilityCurrent = {
  robot_id: string;
  region: Region;
  status: AvailabilityStatus;
  in_stock: boolean | null;
  lead_time_days_min: number | null;
  lead_time_days_max: number | null;
  lead_time_text: string | null;
  source_url: string;
  observed_at: string;
};

export type RobotSource = {
  source_id: string | null;
  source_url: string;
  observed_at: string;
  facts: number;
  name?: string | null;
  kind?: string | null;
  tier?: number | null;
  attribution_text?: string | null;
};
