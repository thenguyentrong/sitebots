import type { CuratedConfidence } from '@/lib/spec/enums';
import type {
  DataSensitivity,
  DustType,
  DustZone,
  ErrorTolerance,
  Exposure,
  FactOrigin,
  FamilyId,
  Floor,
  IncumbentStatus,
  RuleId,
  RuleStatus,
  SafetyCriticality,
  SolutionClassId,
  Variability,
  Verdict,
  WetLevel,
} from '@/lib/content/vocab';
import type { MessageKey } from './messages';

export type Range = { min: number; max: number };
export type Dust = { type: DustType; zone: DustZone };
export type Incumbent = { status: IncumbentStatus; machine_classes: string[] };

/** The facts a task is screened on. null means unknown, and unknown never passes. */
export type TaskFacts = {
  object_mass_kg: Range | null;
  variability: Variability | null;
  error_tolerance: ErrorTolerance | null;
  safety_criticality: SafetyCriticality | null;
  reach_height_m: Range | null;
  environment: Exposure | null;
  dust: Dust | null;
  wet: WetLevel | null;
  floor: Floor | null;
  incumbent_automation: Incumbent | null;
  data_sensitivity: DataSensitivity | null;
  runtime_continuous_min: number | null;
};
export type FactKey = keyof TaskFacts;
export const FACT_KEYS: FactKey[] = [
  'object_mass_kg',
  'variability',
  'error_tolerance',
  'safety_criticality',
  'reach_height_m',
  'environment',
  'dust',
  'wet',
  'floor',
  'incumbent_automation',
  'data_sensitivity',
  'runtime_continuous_min',
];

export type ResolvedFact<K extends FactKey = FactKey> = { value: TaskFacts[K]; origin: FactOrigin; confidence?: CuratedConfidence; note?: string };
export type ResolvedFacts = { [K in FactKey]: ResolvedFact<K> };
export type FactMeta = Partial<Record<FactKey, { confidence: CuratedConfidence; note: string }>>;
/** Where record facts come from: the record's setting decides whether its environment and process facts may travel to the visitor. */
export type FactSource = { setting: string | null; facts: Partial<TaskFacts>; meta?: FactMeta };

export type NotSure = 'not_sure';
/** The slice of the company context the engine reads. Station 0 owns the full context. */
export type ScreenContext = {
  subSetting: string | null;
  dust: Dust | NotSure;
  existingAutomation: string[] | 'none' | NotSure;
  floor: Floor | NotSure;
  exposure: Exposure | NotSure;
  wet: WetLevel | NotSure;
  worksCouncil: 'yes' | 'no' | NotSure;
  shiftPattern: 'one' | 'two' | 'three' | NotSure;
};

export type RuleKind = 'hard' | 'advisory';
export type ScreenOptions = {
  family: FamilyId;
  /** The solution class the screen is run for. The five tests describe humanoids; X2 is hard only for them. */
  forClass: SolutionClassId;
  /** The record's suggested classes, returned as suggestions when the task survives. */
  solutionClasses: SolutionClassId[];
  /** machine class id → task families it covers (from data/taxonomy/machine-classes.yaml). */
  machineClassFamilies: Record<string, readonly FamilyId[]>;
};

export type Evaluation = {
  status: RuleStatus;
  message: MessageKey;
  params?: Record<string, string | number>;
  /** Compliance entry ids to attach (data/compliance). */
  flags?: string[];
  betterAnswer?: SolutionClassId[];
};
export type Rule = {
  id: RuleId;
  kind: RuleKind | ((opts: ScreenOptions) => RuleKind);
  order: number;
  inputs: FactKey[];
  thresholds: string[];
  evaluate: (facts: ResolvedFacts, ctx: ScreenContext, opts: ScreenOptions) => Evaluation;
};
export type RuleResult = Evaluation & { kind: RuleKind; inputs: FactKey[] };

export type ScreenResult = {
  verdict: Verdict;
  results: Record<RuleId, RuleResult>;
  killed_by: RuleId[];
  /** Facts the visitor must supply before a verdict other than unscreened is possible. */
  open_inputs: FactKey[];
  flags: string[];
  better_answer: { class: SolutionClassId | null; message: MessageKey };
  suggested_solution_classes: SolutionClassId[];
  facts: ResolvedFacts;
  thresholds_version: string;
};
