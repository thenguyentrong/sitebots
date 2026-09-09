// Closed vocabularies shared by the schema, the adapters, the curated YAML,
// the matcher and the UI. The database check constraints in db/schema.sql
// repeat the ones that matter for integrity; keep them in step.

export const FORM_FACTORS = ['humanoid', 'quadruped', 'mobile_manipulator'] as const;
export type FormFactor = (typeof FORM_FACTORS)[number];

export const ROBOT_STATUS = ['concept', 'prototype', 'pre_order', 'shipping', 'discontinued', 'unknown'] as const;
export type RobotStatus = (typeof ROBOT_STATUS)[number];

export const SOURCE_KINDS = ['curated', 'manufacturer', 'distributor', 'aggregator', 'index'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

/** Precedence when sources disagree. Lower wins. */
export const SOURCE_TIER = {
  curated: 0,
  manufacturer: 1,
  distributor: 2,
  aggregator: 3,
  estimate: 4,
} as const;
export type SourceTier = (typeof SOURCE_TIER)[keyof typeof SOURCE_TIER];

export const TRUST_LABELS = ['verified', 'assessed', 'reported', 'unknown'] as const;
export type Trust = (typeof TRUST_LABELS)[number];

export const REGIONS = ['US', 'EU', 'DE', 'FR', 'UK', 'CN', 'GLOBAL'] as const;
export type Region = (typeof REGIONS)[number];

/** Price evidence. 1 = read on the manufacturer's own store, 2 = a distributor listing or quote, 3 = press or estimate. */
export const PRICE_TIER = { manufacturer_store: 1, distributor_quote: 2, estimate: 3 } as const;
export type PriceTier = (typeof PRICE_TIER)[keyof typeof PRICE_TIER];

export const AVAILABILITY_STATUS = [
  'for_sale',
  'pre_order',
  'enterprise_only',
  'not_sold',
  'discontinued',
  'unknown',
] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUS)[number];

/**
 * Payload qualifiers. Vendors publish incompatible numbers — Atlas "50 kg
 * instant / 30 kg sustained", H2 "15 kg peak / 7 kg rated single arm", NEO
 * "lift 70 kg / carry 25 kg" — so the qualifier is part of the fact key and
 * the matcher derives one conservative value from whichever exist.
 */
export const PAYLOAD_QUALIFIERS = [
  'rated', // per arm, continuous
  'rated_dual', // both arms together, continuous
  'peak', // per arm, momentary
  'peak_dual',
  'sustained', // whole body, continuous
  'instant', // whole body, momentary
  'carry_walking', // carried while walking
] as const;
export type PayloadQualifier = (typeof PAYLOAD_QUALIFIERS)[number];

export const RUNTIME_BASIS = ['idle', 'walking', 'loaded', 'unstated'] as const;
export type RuntimeBasis = (typeof RUNTIME_BASIS)[number];

export const TASK_CAPABILITIES = [
  'carry_payload',
  'fetch_and_deliver',
  'shelf_pick',
  'tool_handoff',
  'site_inspection',
  'progress_scan_360',
  'lidar_scan',
  'layout_marking',
  'drilling',
  'screwing',
  'cleaning_sweep',
  'material_sorting',
  'patrol_monitoring',
  'teleoperated_manipulation',
  'autonomous_nav_indoor',
  'autonomous_nav_outdoor',
  'stair_climbing',
] as const;
export type TaskCapability = (typeof TASK_CAPABILITIES)[number];

export const CERTIFICATIONS = ['CE', 'UKCA', 'FCC', 'ISO_10218', 'ISO_TS_15066', 'ATEX', 'UL'] as const;
export type Certification = (typeof CERTIFICATIONS)[number];

export const REQUIRES_OPERATOR = ['none', 'supervised', 'teleop'] as const;
export type RequiresOperator = (typeof REQUIRES_OPERATOR)[number];

export const CURATED_CONFIDENCE = ['confirmed', 'likely', 'assumed'] as const;
export type CuratedConfidence = (typeof CURATED_CONFIDENCE)[number];

export const HAND_TYPES = ['none', 'gripper', 'three_finger', 'five_finger'] as const;
export type HandType = (typeof HAND_TYPES)[number];
