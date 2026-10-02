import type { FactOrigin, FamilyId, SolutionClassId } from '@/lib/content/vocab';
import { FACT_KEYS, type FactKey, type ResolvedFacts } from '@/lib/screen/types';
import type { CuratedConfidence } from '@/lib/spec/enums';

export type RequirementReview = {
  key: FactKey;
  label: string;
  status: 'known' | 'missing';
  value: string;
  origin: FactOrigin;
  confidence?: CuratedConfidence;
  evidenceUrl?: string;
  note?: string;
  question: string;
};
export type SolutionClassReview = { id: SolutionClassId; reason: string; evidenceQuestions: string[] };
export type OpportunityReview = {
  modelVersion: 'opportunity-v1';
  status: 'needs_information' | 'ready_to_compare';
  missingFacts: FactKey[];
  requirements: RequirementReview[];
  solutionClasses: SolutionClassReview[];
  evidenceQuestions: string[];
  flags: string[];
  scopeNote: string;
};

export const REQUIREMENT_LABELS: Record<FactKey, string> = {
  object_mass_kg: 'Object mass',
  variability: 'Task variability',
  error_tolerance: 'Consequences of errors',
  safety_criticality: 'Safety relevance',
  reach_height_m: 'Working height',
  environment: 'Indoor or outdoor work',
  dust: 'Dust and hazardous areas',
  wet: 'Water exposure',
  floor: 'Floor and route conditions',
  incumbent_automation: 'Existing equipment',
  data_sensitivity: 'Data handling',
  runtime_continuous_min: 'Continuous operating time',
};

const MISSING_QUESTIONS: Record<FactKey, string> = {
  object_mass_kg: 'What is the heaviest object, including any container, and how must it be gripped and moved?',
  variability: 'How often do objects, positions, routes or work steps change?',
  error_tolerance: 'What can go wrong, how is an error detected, and what recovery is acceptable?',
  safety_criticality: 'Could a mistake affect a structural connection, fire protection or a person, and who reviews those consequences?',
  reach_height_m: 'At what heights and distances must the tool or load work, including the highest and lowest points?',
  environment: 'Does the task take place indoors, outdoors or in both, and under which temperatures and weather?',
  dust: 'Which dusts are present, how are they controlled, and has a hazardous area been identified?',
  wet: 'Is the equipment exposed to splashes, rain, washdown or other liquids?',
  floor: 'What surfaces, slopes, gaps, thresholds and stairs are on the route or working area?',
  incumbent_automation: 'Which equipment already performs this step, and where do people still intervene?',
  data_sensitivity: 'Will the system record people, confidential processes or other restricted information?',
  runtime_continuous_min: 'How long must work continue under load, and which charging, swapping or service pauses are acceptable?',
};

const EVIDENCE_QUESTIONS: Record<FactKey, string> = {
  object_mass_kg: 'Which exact configuration is rated for this load, grip, working reach and motion, including the tool or container?',
  variability: 'Which representative part and process variants has the complete solution handled, and what setup or retraining does each change require?',
  error_tolerance: 'What measured error and intervention rates meet this task\'s acceptance criteria, and how are failures detected and recovered?',
  safety_criticality: 'What application-specific risk review, safeguards and acceptance evidence cover the consequences of a failure?',
  reach_height_m: 'Does the loaded tool reach every required position and orientation without relying on body height as working reach?',
  environment: 'What operating-temperature and weather evidence covers the exact installed configuration in this environment?',
  dust: 'What evidence covers the dust type, exposure, protection, cleaning and maintenance of the complete installed system?',
  wet: 'What evidence covers this water exposure for the complete configuration, including connectors and tooling, and what operating restrictions apply?',
  floor: 'Has the loaded system been assessed on representative surfaces, slopes, gaps, thresholds and stairs?',
  incumbent_automation: 'How do alternatives compare with the existing process on output, interventions, changeovers and total cost?',
  data_sensitivity: 'What information is collected, where is it processed and retained, and who controls access?',
  runtime_continuous_min: 'What measured runtime under representative load meets this operating period, including charging, battery changes and downtime?',
};

const CLASS_QUESTIONS: Record<SolutionClassId, string[]> = {
  humanoid: ['Which exact platform, hands, software and operator support have demonstrated this complete task?', 'What intervention time and sustained performance were measured in comparable conditions?'],
  mobile_manipulator_wheeled: ['Can the loaded mobile base and tool access every station and perform the required handling?', 'What fixtures, navigation setup, docking and operator support are needed?'],
  quadruped_inspection: ['Which sensor payload, mission software and reporting workflow deliver the required inspection output?', 'What loaded route and environmental evidence covers this installation?'],
  fixed_cobot_cell: ['Can parts be presented consistently, and which tooling, fixtures and safeguards does the cell need?', 'What cycle time and changeover performance have been measured for this part mix?'],
  vacuum_lifter_assist: ['Does the lifting device support the object\'s mass, geometry and surface with the intended grip?', 'Which actions remain with the operator and what space does the handling cycle need?'],
  gantry: ['Does the proposed lifting system cover the load, working envelope and travel path?', 'What supporting structure, tooling, access controls and operator responsibilities are required?'],
  amr_carts: ['Does the complete transport system support the loaded cart or pallet on the actual route?', 'Who loads and unloads, and how are docking, traffic, obstructions and recovery handled?'],
  dedicated_machine: ['Which complete machine configuration performs the required output in comparable conditions?', 'What installation, integration, operator support and service does it require?'],
  keep_process: ['What are the current output, staffing, intervention time, quality and operating costs?', 'Which current bottlenecks would an alternative need to improve?'],
  process_change: ['Which changes to presentation, layout or exposure would simplify the work?', 'How will their effect on output, effort and operating conditions be measured?'],
};

const formatNumber = (value: number) => value.toLocaleString('en-GB', { maximumFractionDigits: 3 });
function range(value: { min: number; max: number }, unit: string): string {
  return `${value.min === value.max ? formatNumber(value.max) : `${formatNumber(value.min)}–${formatNumber(value.max)}`} ${unit}`;
}
const WORDS: Record<string, string> = {
  low: 'Low', medium: 'Medium', high: 'High', tolerant: 'Recoverable errors', limited: 'Limited tolerance for errors', critical: 'Critical consequences',
  none: 'None identified', structural: 'Structural safety', life_safety: 'Life safety', indoor: 'Indoors', outdoor: 'Outdoors', both: 'Indoors and outdoors',
  dry: 'Dry', damp: 'Damp or splash exposure', rain: 'Rain exposure', level: 'Level floor', uneven: 'Uneven floor', stairs: 'Stairs', mixed: 'Mixed conditions',
  personal_data: 'Personal data', confidential: 'Confidential information', full: 'Equipment covers this step', partial: 'Partly automated',
  controlled: 'Controlled', zone: 'Classified or heavy dust area', atex: 'Potentially explosive atmosphere', wood: 'Wood', mineral: 'Mineral', cement: 'Cement',
};
function displayValue(key: FactKey, facts: ResolvedFacts): string {
  const value = facts[key].value;
  if (value === null) return 'Not provided';
  if (key === 'object_mass_kg') return range(facts.object_mass_kg.value!, 'kg');
  if (key === 'reach_height_m') return range(facts.reach_height_m.value!, 'm');
  if (key === 'runtime_continuous_min') return `${formatNumber(facts.runtime_continuous_min.value!)} min`;
  if (key === 'dust') {
    const dust = facts.dust.value!;
    return `${WORDS[dust.type] ?? dust.type}; ${WORDS[dust.zone] ?? dust.zone}`;
  }
  if (key === 'incumbent_automation') {
    const equipment = facts.incumbent_automation.value!;
    return `${WORDS[equipment.status]}${equipment.machine_classes.length ? `: ${equipment.machine_classes.join(', ')}` : ''}`;
  }
  return WORDS[String(value)] ?? String(value);
}

/**
 * This reviews task information and comparison options, not a robot's capability.
 * No class-wide payload, reliability or runtime ceiling is inferred. Missing facts
 * remain questions and never remove the opportunity from discovery or comparison.
 */
export function reviewOpportunity(facts: ResolvedFacts, family: FamilyId, suggestedSolutionClasses: readonly SolutionClassId[] = []): OpportunityReview {
  const requirements: RequirementReview[] = FACT_KEYS.map((key) => {
    const fact = facts[key];
    const status = fact.value === null ? 'missing' : 'known';
    let question = status === 'missing' ? MISSING_QUESTIONS[key] : EVIDENCE_QUESTIONS[key];
    if (key === 'dust' && facts.dust.value?.zone === 'atex') {
      question = 'Which hazardous-area classification and configuration-specific suitability evidence apply, and has a qualified specialist reviewed the complete installation?';
    }
    return {
      key, label: REQUIREMENT_LABELS[key], status, value: displayValue(key, facts), origin: fact.origin,
      ...(fact.confidence ? { confidence: fact.confidence } : {}),
      ...(fact.evidence_url ? { evidenceUrl: fact.evidence_url } : {}),
      ...(fact.note ? { note: fact.note } : {}), question,
    };
  });
  const missingFacts = requirements.filter((r) => r.status === 'missing').map((r) => r.key);
  const classes = new Map<SolutionClassId, SolutionClassReview>();
  const add = (id: SolutionClassId, reason: string) => {
    const existing = classes.get(id);
    if (existing) {
      if (!existing.reason.includes(reason)) existing.reason += ' ' + reason;
    } else classes.set(id, { id, reason, evidenceQuestions: [...CLASS_QUESTIONS[id]] });
  };
  add('keep_process', 'Measure the current process as the baseline for every alternative.');
  add('dedicated_machine', 'Compare equipment designed for this work; verify an exact product and configuration before judging fit.');
  for (const id of suggestedSolutionClasses) add(id, 'Suggested by the task record; its suitability for these requirements still needs evidence.');
  if (facts.incumbent_automation.value && facts.incumbent_automation.value.status !== 'none') {
    add('keep_process', 'Existing equipment already covers some or all of the step; include its remaining interventions and costs.');
    add('dedicated_machine', 'Compare improvement or replacement of the incumbent equipment alongside other approaches.');
  }
  if (facts.variability.value === 'low') add('fixed_cobot_cell', 'The repeatable task warrants comparison with a fixed cell and consistent part presentation.');
  if (family === 'intralogistics_transport') add('amr_carts', 'This is a transport task; assess a loaded cart or pallet system against the actual route and handoffs.');
  if (family === 'heavy_element_handling') {
    add('gantry', 'The task involves large loads; compare a lifting system sized for the load and working envelope.');
    add('vacuum_lifter_assist', 'Compare assisted handling where object geometry, surface and grip permit it.');
  }
  if (family === 'machine_tending' || family === 'kitting_picking_sorting' || family === 'packaging_palletising_loading') {
    add('fixed_cobot_cell', 'Compare a cell with task-specific tools and part presentation for the handling step.');
    add('mobile_manipulator_wheeled', 'Compare mobile handling if movement between stations adds value and routes permit access.');
  }
  if (family === 'inspection_qa_documentation' || family === 'monitoring_safety_patrol') {
    add('quadruped_inspection', 'Compare a mobile sensing system where the route and required measurements justify it.');
  }
  if (facts.dust.value?.zone === 'zone' || facts.dust.value?.zone === 'atex' || facts.wet.value === 'rain' || facts.floor.value === 'mixed') {
    add('process_change', 'Compare changes to exposure, layout or presentation before specifying a system for difficult conditions.');
  }
  const flags: string[] = [];
  if (facts.dust.value?.zone === 'atex') flags.push('atex_betrsichv');
  if (facts.dust.value && facts.dust.value.zone !== 'none') {
    if (facts.dust.value.type === 'wood') flags.push('wood_dust_trgs_553');
    else if (facts.dust.value.type !== 'none') flags.push('mineral_dust_trgs_559');
  }
  if (facts.data_sensitivity.value === 'personal_data') flags.push('gdpr_art_88_bdsg_26');
  if (facts.data_sensitivity.value === 'confidential') flags.push('data_residency_air_gapped');
  return {
    modelVersion: 'opportunity-v1', status: missingFacts.length ? 'needs_information' : 'ready_to_compare',
    missingFacts, requirements, solutionClasses: [...classes.values()],
    evidenceQuestions: [...new Set(requirements.map((r) => r.question))], flags,
    scopeNote: 'These are task requirements and options to investigate. Knowing the requirements does not show that any robot or complete solution can perform the task. Compare configurations and evidence, including when inputs are still missing.',
  };
}
