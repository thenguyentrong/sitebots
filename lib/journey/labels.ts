import type { ContextRole } from '@/lib/context/schema';
import type {
  DataSensitivity,
  DustType,
  DustZone,
  ErrorTolerance,
  Exposure,
  Floor,
  IncumbentStatus,
  RuleId,
  RuleStatus,
  SafetyCriticality,
  SettingGroup,
  ValueDriver,
  Variability,
  Verdict,
  WetLevel,
  LvUnit,
  SiteSection,
} from '@/lib/content/vocab';

/** English UI labels for the closed vocabularies, short enough for chips. The German set follows with the dictionaries. */

export const NOT_SURE_LABEL = 'Not sure';

export const GROUP_LABELS: Record<SettingGroup, string> = {
  site: 'Construction site',
  factory: 'Factory and prefabrication',
  yard_logistics: 'Yard and logistics',
  operations: 'Operations and inspection',
};
/** Sections of the construction-site group, English with the German LV term. */
export const SECTION_LABELS: Record<SiteSection, { en: string; de: string }> = {
  site_wide: { en: 'Site setup and logistics', de: 'Baustelle und Logistik' },
  structure: { en: 'Structure', de: 'Rohbau' },
  envelope: { en: 'Envelope', de: 'Gebäudehülle' },
  interior: { en: 'Interior finishing', de: 'Ausbau' },
  services: { en: 'Building services', de: 'TGA' },
  civil: { en: 'Civil works and outdoor', de: 'Tiefbau und Außenanlagen' },
  demolition_repair: { en: 'Demolition and repair', de: 'Rückbau und Instandsetzung' },
};
/** The second context question, worded per group. */
export const SUBSETTING_QUESTION: Record<SettingGroup, { label: string; hint: string }> = {
  site: { label: 'Trade, as in the LV', hint: 'Grouped like a Leistungsverzeichnis: STLB-Bau Leistungsbereich (LB) and VOB/C trade standard. The count is how many screened tasks the library holds for each trade.' },
  factory: { label: 'Kind of plant', hint: 'The count is how many screened tasks the library holds for each kind of plant.' },
  yard_logistics: { label: 'Kind of yard or hub', hint: 'The count is how many screened tasks the library holds for each one.' },
  operations: { label: 'Kind of asset or building', hint: 'The count is how many screened tasks the library holds for each one.' },
};
export const LV_UNIT_LABELS: Record<LvUnit, string> = { m: 'm', m2: 'm²', m3: 'm³', pcs: 'pcs', kg: 'kg', t: 't', h: 'h', lump: 'lump sum' };
/** "LB 039" or "LB 040/041"; empty for work outside the LV. */
export const lbLabel = (lb: readonly string[] | null | undefined) => (lb && lb.length ? 'LB ' + lb.join('/') : '');
/** "4 tasks", the number shown next to a trade or plant. */
export const tasksLabel = (n: number) => `${n} task${n === 1 ? '' : 's'}`;

/** How the check speaks about the place a task happens: the record stands for a typical one, the visitor answers for their own. */
export const PLACE_LABELS: Record<SettingGroup, { typical: string; your: string }> = {
  site: { typical: 'a typical site in this trade', your: 'your site' },
  factory: { typical: 'a typical plant of this kind', your: 'your plant' },
  yard_logistics: { typical: 'a typical yard of this kind', your: 'your yard' },
  operations: { typical: 'a typical building of this kind', your: 'your building' },
};
export const GROUP_HINTS: Record<SettingGroup, string> = {
  site: 'By LV trade: structure, envelope, interior, building services, civil works',
  factory: 'Precast, modular, joinery, steel, facade and timber elements',
  yard_logistics: 'Warehouses, logistics hubs, rental depots',
  operations: 'Building operation and asset inspection',
};

export const DUST_ZONE_LABELS: Record<DustZone, string> = { none: 'No relevant dust', controlled: 'Controlled, no classified zone', zone: 'Classified dust area', atex: 'ATEX zone' };
export const DUST_ZONE_HINTS: Record<DustZone, string> = {
  none: 'Clean assembly, logistics or office-like areas.',
  controlled: 'A workroom with a documented cleaning plan; dust layers kept thin.',
  zone: 'Around saws, mills, cutting or demolition; no humanoid publishes a usable ingress rating.',
  atex: 'Filters, silos, extraction plant, solvent areas: certified equipment only.',
};
export const DUST_TYPE_LABELS: Record<DustType, string> = { none: 'None', wood: 'Wood', mineral: 'Mineral or quartz', cement: 'Cement', mixed: 'Mixed' };
export const FLOOR_LABELS: Record<Floor, string> = { level: 'Level floor', uneven: 'Uneven or gravel', stairs: 'Stairs or levels', mixed: 'Mixed' };
export const EXPOSURE_LABELS: Record<Exposure, string> = { indoor: 'Indoor', outdoor: 'Outdoor', both: 'Both' };
export const WET_LABELS: Record<WetLevel, string> = { dry: 'Dry', damp: 'Damp', rain: 'Rain or wet' };
export const VARIABILITY_LABELS: Record<Variability, string> = { low: 'Low: same every time', medium: 'Medium: a few variants', high: 'High: different every time' };
export const ERROR_TOLERANCE_LABELS: Record<ErrorTolerance, string> = { tolerant: 'Caught and corrected', limited: 'Costs rework', critical: 'Safety or structural failure' };
export const SAFETY_LABELS: Record<SafetyCriticality, string> = { none: 'None', structural: 'Structural', life_safety: 'Life safety' };
export const INCUMBENT_LABELS: Record<IncumbentStatus, string> = { none: 'No machine does it', partial: 'Partly automated', full: 'A dedicated machine does it' };
export const DATA_SENSITIVITY_LABELS: Record<DataSensitivity, string> = { none: 'No people in view', personal_data: 'Cameras may record people', confidential: 'Confidential process data' };
export const VALUE_DRIVER_LABELS: Record<ValueDriver, string> = {
  ergonomics: 'Less strain on people',
  precision: 'Precision',
  capacity: 'Capacity without hiring',
  quality: 'Quality and traceability',
  exposure: 'Less exposure to hazards',
  skills_shortage: 'Skills shortage',
  cost: 'Cost per unit',
};
export const EXISTING_AUTOMATION_LABELS = { listed: 'Yes, these machines', none: 'None for this work', not_sure: NOT_SURE_LABEL } as const;
export const TIMELINE_LABELS = { pilot_within_6_months: 'Pilot within six months', '6_to_18_months': 'Six to eighteen months', exploring: 'Exploring, no date', not_sure: NOT_SURE_LABEL } as const;
export const PROCUREMENT_LABELS = { buy: 'Buy', lease: 'Lease', raas: 'Robot as a service', not_sure: NOT_SURE_LABEL } as const;
export const SHIFT_LABELS = { one: 'One shift', two: 'Two shifts', three: 'Three shifts', not_sure: NOT_SURE_LABEL } as const;
export const WORKS_COUNCIL_LABELS = { yes: 'Yes', no: 'No', not_sure: NOT_SURE_LABEL } as const;
export const IT_DATA_LABELS = { no_cloud: 'No cloud services', no_video_of_people: 'No video of people', no_permanent_connectivity: 'No permanent connectivity' } as const;
export const ROLE_LABELS: Record<ContextRole, string> = {
  sponsor: 'Sponsor with budget',
  project_lead: 'Project lead',
  production_lead: 'Production lead',
  works_council_contact: 'Works council contact',
  it_data_protection: 'IT and data protection',
  safety_officer: 'Safety officer',
};

export const VERDICT_LABELS: Record<Verdict, string> = { candidate: 'Candidate', marginal: 'Marginal', ruled_out: 'Ruled out', unscreened: 'Unscreened' };
export const VERDICT_HINTS: Record<Verdict, string> = {
  candidate: 'Passes the five tests. Worth prioritising and comparing complete solutions for.',
  marginal: 'Passes, but one test is borderline. Quote the conventional alternative in parallel.',
  ruled_out: 'Fails at least one hard test. The better answer is named.',
  unscreened: 'A hard test could not be evaluated yet. Answer the open question to get a verdict.',
};
export const RULE_LABELS: Record<RuleId, string> = {
  T1_mass: 'Object under 15 kg',
  T2_dust: 'Dust is controlled',
  T3_incumbent: 'No machine does it already',
  T4_variability: 'Too variable for a fixed cell',
  T5_failure_tolerance: 'A 1 % failure rate is tolerable',
  X1_reach: 'Working height',
  X2_outdoor: 'Indoor and dry',
  X3_data: 'Cameras and data',
  X4_runtime: 'Runtime',
  X5_atex: 'No explosive atmosphere',
};
/** Tile-sized names for the tests. */
export const TEST_SHORT: Record<RuleId, string> = {
  T1_mass: 'Under 15 kg',
  T2_dust: 'Dust controlled',
  T3_incumbent: 'No machine yet',
  T4_variability: 'Too variable for a cell',
  T5_failure_tolerance: '1 % errors OK',
  X1_reach: 'Reach',
  X2_outdoor: 'Indoor, dry',
  X3_data: 'Cameras',
  X4_runtime: 'Runtime',
  X5_atex: 'No ATEX',
};
/** The five questions, for the landing. */
export const TEST_QUESTIONS: Record<RuleId, string> = {
  T1_mass: 'Is the heaviest object under 15 kg? The 2025/26 generation carries 20–25 kg at most.',
  T2_dust: 'Is the dust controlled? No humanoid publishes a usable ingress rating.',
  T3_incumbent: 'Does no machine do it already? A dedicated machine wins on speed, payload and cost.',
  T4_variability: 'Is it too variable for a fixed cell? Otherwise a cobot cell beats a humanoid on cost.',
  T5_failure_tolerance: 'Is a 1 % failure rate tolerable? Nothing structural, nothing safety-critical.',
  X1_reach: '', X2_outdoor: '', X3_data: '', X4_runtime: '', X5_atex: '',
};
export const STATUS_LABELS: Record<RuleStatus, string> = { pass: 'Pass', marginal: 'Marginal', fail: 'Fail', unknown: 'Open', flag: 'Note' };
