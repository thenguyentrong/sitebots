import type { RobotCard } from '@/lib/spec/types';
import type { Candidate } from './types';

/** Synthetic robots for the matcher tests. Not real data. */
function card(over: Partial<RobotCard> & { id: string; name: string }): RobotCard {
  return {
    model_slug: over.id,
    variant: 'base',
    form_factor: 'humanoid',
    status: 'shipping',
    release_year: 2025,
    summary: null,
    manufacturer_id: 'm',
    manufacturer_slug: 'test',
    manufacturer_name: 'Test',
    manufacturer_country: null,
    height_m: null,
    height_min_m: null,
    height_max_m: null,
    weight_kg: null,
    payload_kg_conservative: null,
    payload_kg_rated: null,
    payload_kg_peak: null,
    reach_m: null,
    dof_total: null,
    walk_speed_ms: null,
    max_speed_ms: null,
    runtime_h: null,
    runtime_basis: null,
    hot_swap: null,
    ip_rating: null,
    ip_solid: null,
    ip_liquid: null,
    temp_min_c: null,
    temp_max_c: null,
    stair_capable: null,
    max_slope_deg: null,
    step_height_m: null,
    outdoor_rated: null,
    noise_db: null,
    certifications: [],
    task_capabilities: [],
    requires_operator: null,
    trl: null,
    specs: {},
    verified_fields: [],
    completeness: 0,
    image_url: null,
    image_alt: null,
    price_amount: null,
    price_currency: null,
    price_region: null,
    price_tier: null,
    price_direct: null,
    price_observed_at: null,
    price_stale: null,
    price_source_url: null,
    ...over,
  };
}

const spec = (value: number | string | boolean, tier = 1) => ({
  value,
  source_url: tier === 1 ? 'https://maker.example/spec' : 'https://db.example/robot',
  source_tier: tier,
  observed_at: '2026-09-01T00:00:00.000Z',
  confidence: 0.8,
  trust: tier === 1 ? ('verified' as const) : ('reported' as const),
});

/** Small research humanoid: 2 kg per arm, indoor, teleoperated, cheap. */
export const smallHumanoid: Candidate = {
  card: card({
    id: 'small',
    name: 'Small Humanoid',
    height_m: 1.32,
    height_max_m: 1.32,
    weight_kg: 35,
    payload_kg_conservative: 2,
    payload_kg_rated: 2,
    runtime_h: 2,
    runtime_basis: 'unstated',
    outdoor_rated: false,
    requires_operator: 'teleop',
    task_capabilities: ['teleoperated_manipulation', 'carry_payload'],
    specs: { height_m: spec(1.32), weight_kg: spec(35), 'payload_kg:rated': spec(2), 'runtime_h:unstated': spec(2) },
    verified_fields: ['height_m', 'weight_kg', 'payload_kg:rated', 'runtime_h:unstated'],
    completeness: 0.4,
  }),
  prices: [{ robot_id: 'small', region: 'US', config: 'base', amount: 13500, currency: 'USD', tier: 1, direct: true, includes_vat: false, source_id: 'store', source_url: 'https://store.example/small', observed_at: '2026-09-01T00:00:00.000Z', stale: false }],
  availability: [{ robot_id: 'small', region: 'US', status: 'for_sale', in_stock: true, lead_time_days_min: null, lead_time_days_max: null, lead_time_text: null, source_url: 'https://store.example/small', observed_at: '2026-09-01T00:00:00.000Z' }],
};

/** Site quadruped: 14 kg on the back, IP54, stairs, outdoor, quote only. */
export const siteQuadruped: Candidate = {
  card: card({
    id: 'quad',
    name: 'Site Quadruped',
    form_factor: 'quadruped',
    height_m: 0.61,
    height_max_m: 0.7,
    weight_kg: 33.8,
    payload_kg_conservative: 14,
    runtime_h: 1.5,
    runtime_basis: 'unstated',
    hot_swap: true,
    ip_rating: 'IP54',
    ip_solid: 5,
    ip_liquid: 4,
    temp_min_c: -20,
    temp_max_c: 55,
    stair_capable: true,
    step_height_m: 0.3,
    max_slope_deg: 30,
    outdoor_rated: true,
    requires_operator: 'supervised',
    certifications: ['CE'],
    task_capabilities: ['site_inspection', 'carry_payload', 'stair_climbing', 'autonomous_nav_outdoor', 'autonomous_nav_indoor'],
    specs: { height_m: spec(0.61), weight_kg: spec(33.8), 'payload_kg:sustained': spec(14), ip_rating: spec('IP54'), stair_capable: spec(true) },
    verified_fields: ['height_m', 'weight_kg', 'payload_kg:sustained', 'ip_rating', 'stair_capable'],
    completeness: 0.8,
  }),
  prices: [],
  availability: [{ robot_id: 'quad', region: 'GLOBAL', status: 'enterprise_only', in_stock: null, lead_time_days_min: null, lead_time_days_max: null, lead_time_text: 'Quote only', source_url: 'https://maker.example/quad', observed_at: '2026-09-01T00:00:00.000Z' }],
};

/** Big humanoid with a lot unknown: 20 kg both arms, nothing else published. */
export const unknownHumanoid: Candidate = {
  card: card({
    id: 'unknown',
    name: 'Mystery Humanoid',
    height_m: 1.75,
    height_max_m: 1.75,
    payload_kg_conservative: 20,
    specs: { height_m: spec(1.75, 3), 'payload_kg:rated_dual': spec(20, 3) },
    completeness: 0.15,
  }),
  prices: [{ robot_id: 'unknown', region: 'GLOBAL', config: 'base', amount: 150000, currency: 'USD', tier: 3, direct: false, includes_vat: null, source_id: 'db', source_url: 'https://db.example/robot', observed_at: '2026-09-01T00:00:00.000Z', stale: false }],
  availability: [],
};

/** EU-listed wheeled manipulator with a real distributor price. */
export const wheeledEu: Candidate = {
  card: card({
    id: 'wheeled',
    name: 'Wheeled Manipulator',
    form_factor: 'mobile_manipulator',
    height_m: 1.5,
    height_max_m: 1.9,
    payload_kg_conservative: 10,
    runtime_h: 8,
    runtime_basis: 'loaded',
    ip_rating: 'IP20',
    ip_solid: 2,
    ip_liquid: 0,
    outdoor_rated: false,
    stair_capable: false,
    requires_operator: 'none',
    task_capabilities: ['fetch_and_deliver', 'carry_payload', 'autonomous_nav_indoor'],
    specs: { height_m: spec(1.5), 'payload_kg:rated': spec(10), 'runtime_h:loaded': spec(8) },
    verified_fields: ['height_m', 'payload_kg:rated', 'runtime_h:loaded'],
    completeness: 0.5,
  }),
  prices: [{ robot_id: 'wheeled', region: 'DE', config: 'base', amount: 42000, currency: 'EUR', tier: 2, direct: true, includes_vat: false, source_id: 'dist', source_url: 'https://distributor.example/wheeled', observed_at: '2026-09-01T00:00:00.000Z', stale: false }],
  availability: [{ robot_id: 'wheeled', region: 'DE', status: 'for_sale', in_stock: true, lead_time_days_min: 7, lead_time_days_max: 14, lead_time_text: null, source_url: 'https://distributor.example/wheeled', observed_at: '2026-09-01T00:00:00.000Z' }],
};

export const FIXTURES: Candidate[] = [smallHumanoid, siteQuadruped, unknownHumanoid, wheeledEu];
