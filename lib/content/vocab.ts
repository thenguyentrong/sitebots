// Closed vocabularies for the decision-journey content: data/tasks, data/settings,
// data/taxonomy, data/compliance, data/costs, data/reference, data/partners.
//
// The YAML files carry labels, notes and evidence; the ids live here so the screen
// engine, the schemas, the tests and the UI agree without loading YAML. Task records
// pin a verdict against these ids, so changes are additive only.

export const LOCALES = ['en', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

export const NOT_SURE = 'not_sure' as const;

/** Four top-level settings. The site is for the whole construction industry; wood is the first worked case. */
export const SETTING_GROUPS = ['site', 'factory', 'yard_logistics', 'operations'] as const;
/**
 * Sections of the construction-site group, in the order a Leistungsverzeichnis
 * runs: site setup, structure, envelope, interior, building services, civil
 * works, demolition and repair. The grouping is ours; the trades inside each
 * section are STLB-Bau Leistungsbereiche and VOB/C ATVs.
 */
export const SITE_SECTIONS = ['site_wide', 'structure', 'envelope', 'interior', 'services', 'civil', 'demolition_repair'] as const;
export type SiteSection = (typeof SITE_SECTIONS)[number];
/** LV units of measure as they appear in a position (m², m, Stück …). */
export const LV_UNITS = ['m', 'm2', 'm3', 'pcs', 'kg', 't', 'h', 'lump'] as const;
export type LvUnit = (typeof LV_UNITS)[number];
export type SettingGroup = (typeof SETTING_GROUPS)[number];

/** Task families cut across settings; every task record belongs to exactly one. */
export const FAMILY_IDS = [
  'intralogistics_transport',
  'kitting_picking_sorting',
  'machine_tending',
  'assembly_fastening',
  'inspection_qa_documentation',
  'layout_marking_surveying',
  'surface_finishing',
  'cleaning_housekeeping_replenishment',
  'heavy_element_handling',
  'packaging_palletising_loading',
  'monitoring_safety_patrol',
  'machine_operation_dedicated',
] as const;
export type FamilyId = (typeof FAMILY_IDS)[number];

/**
 * What the Systems station compares. The first three map to catalogue form factors;
 * the rest are answers the catalogue does not carry as rows, so a ruled-out task can
 * still end in a decision.
 */
export const SOLUTION_CLASS_IDS = [
  'humanoid',
  'mobile_manipulator_wheeled',
  'quadruped_inspection',
  'fixed_cobot_cell',
  'vacuum_lifter_assist',
  'gantry',
  'amr_carts',
  'dedicated_machine',
  'keep_process',
  'process_change',
] as const;
export type SolutionClassId = (typeof SOLUTION_CLASS_IDS)[number];

export const DUST_TYPES = ['none', 'wood', 'mineral', 'cement', 'mixed'] as const;
export type DustType = (typeof DUST_TYPES)[number];
/** none = no relevant dust · controlled = workroom that is "keine Zone" with a cleaning plan · zone = classified or heavy dust area · atex = explosive atmosphere zone */
export const DUST_ZONES = ['none', 'controlled', 'zone', 'atex'] as const;
export type DustZone = (typeof DUST_ZONES)[number];
export const WET_LEVELS = ['dry', 'damp', 'rain'] as const;
export type WetLevel = (typeof WET_LEVELS)[number];
export const FLOORS = ['level', 'uneven', 'stairs', 'mixed'] as const;
export type Floor = (typeof FLOORS)[number];
export const EXPOSURES = ['indoor', 'outdoor', 'both'] as const;
export type Exposure = (typeof EXPOSURES)[number];
export const VARIABILITY = ['low', 'medium', 'high'] as const;
export type Variability = (typeof VARIABILITY)[number];
export const ERROR_TOLERANCE = ['tolerant', 'limited', 'critical'] as const;
export type ErrorTolerance = (typeof ERROR_TOLERANCE)[number];
export const SAFETY_CRITICALITY = ['none', 'structural', 'life_safety'] as const;
export type SafetyCriticality = (typeof SAFETY_CRITICALITY)[number];
export const INCUMBENT_STATUS = ['none', 'partial', 'full'] as const;
export type IncumbentStatus = (typeof INCUMBENT_STATUS)[number];
export const DATA_SENSITIVITY = ['none', 'personal_data', 'confidential'] as const;
export type DataSensitivity = (typeof DATA_SENSITIVITY)[number];

export const VERDICTS = ['candidate', 'marginal', 'ruled_out', 'unscreened'] as const;
export type Verdict = (typeof VERDICTS)[number];
export const RULE_IDS = [
  'T1_mass',
  'T2_dust',
  'T3_incumbent',
  'T4_variability',
  'T5_failure_tolerance',
  'X1_reach',
  'X2_outdoor',
  'X3_data',
  'X4_runtime',
  'X5_atex',
] as const;
export type RuleId = (typeof RULE_IDS)[number];
export const RULE_STATUS = ['pass', 'marginal', 'fail', 'unknown', 'flag'] as const;
export type RuleStatus = (typeof RULE_STATUS)[number];
export const FACT_ORIGINS = ['record', 'visitor', 'context', 'none'] as const;
export type FactOrigin = (typeof FACT_ORIGINS)[number];

export const EVIDENCE_TYPES = ['claim', 'demo', 'pilot', 'deployment'] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export const EVIDENCE_KINDS = ['manufacturer', 'operator', 'press', 'academic', 'standard', 'regulator', 'analyst'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
export const VALUE_DRIVERS = ['ergonomics', 'precision', 'capacity', 'quality', 'exposure', 'skills_shortage', 'cost'] as const;
export type ValueDriver = (typeof VALUE_DRIVERS)[number];
export const COVERAGE = ['screened', 'scaffold'] as const;
export type Coverage = (typeof COVERAGE)[number];
export const RECORD_STATUS = ['published', 'draft'] as const;
export type RecordStatus = (typeof RECORD_STATUS)[number];

// Implementation station vocabularies.
export const ROADMAP_OWNERS = ['management', 'procurement', 'safety', 'it', 'production', 'integrator', 'vendor', 'works_council'] as const;
export type RoadmapOwner = (typeof ROADMAP_OWNERS)[number];
export const COMPLIANCE_KINDS = ['regulation', 'directive', 'law', 'standard', 'guideline', 'ruling', 'other'] as const;
export const COMPLIANCE_STATUS = ['in_force', 'published', 'upcoming', 'draft', 'unpublished', 'amended_pending'] as const;
export const COMPLIANCE_TRIGGERS = [
  'always',
  'legged_platform',
  'outdoor',
  'cameras_on_people',
  'non_eu_import',
  'wood_dust',
  'mineral_dust',
  'atex_zone',
  'works_council',
  'ai_component',
  'self_learning',
] as const;
export type ComplianceTrigger = (typeof COMPLIANCE_TRIGGERS)[number];
export const COST_BLOCKS = ['A', 'B', 'C', 'D'] as const;
export type CostBlock = (typeof COST_BLOCKS)[number];
export const COST_UNITS = ['lump_sum', 'per_unit', 'per_year', 'percent_of_machine'] as const;
export const SCENARIOS = ['lab', 'measurable', 'plant'] as const;
export type Scenario = (typeof SCENARIOS)[number];
export const PARTNER_TYPES = ['neutral_advisor', 'research', 'integrator', 'vendor_eu_entity', 'test_lab', 'accident_insurer', 'chamber'] as const;
export const LIMIT_BASIS = ['catalogue_stats', 'analyst', 'source'] as const;
