import type { L10n } from '@/lib/content/l10n';
import type { Coverage, DustType, DustZone, EvidenceKind, EvidenceType, Exposure, FamilyId, Floor, RuleId, RuleStatus, SettingGroup, SolutionClassId, ValueDriver, Verdict, LvUnit, SiteSection } from '@/lib/content/vocab';
import type { Facts } from '@/lib/screen/facts';
import type { CuratedConfidence, TaskCapability } from '@/lib/spec/enums';

/**
 * Client-safe projections of the YAML content. Server pages build them with
 * lib/tasks/cards.ts and pass them as props; the browser never reads YAML.
 */

export type FactMetaMap = Partial<Record<keyof Facts, { confidence: CuratedConfidence; note: string; evidence_url?: string }>>;

export type TaskCardEvidence = { statement: L10n; url: string; kind: EvidenceKind; type: EvidenceType; date: string; tier: number; note?: string };

/** One requirement value with where it comes from; null when the record does not carry it. */
export type RequirementEntry<T> = { value: T | null; confidence: string; note: string; evidence_url?: string } | null;
export type TaskLvRef = { lb: string | null; atv: string | null; position: L10n; unit: LvUnit };

export type TaskCard = {
  id: string;
  slug: string;
  setting: string;
  family: FamilyId;
  trades: string[];
  title: L10n;
  summary: L10n;
  description: L10n;
  facts: Facts;
  meta: FactMetaMap;
  reference_verdict: Verdict;
  reference_results: Record<RuleId, RuleStatus>;
  killed_by: RuleId[];
  better_answer: { class: SolutionClassId | null; note: L10n };
  solution_classes: SolutionClassId[];
  capabilities_required: TaskCapability[];
  value_drivers: ValueDriver[];
  also_in_settings: string[];
  evidence: TaskCardEvidence[];
  pilot: { metrics: string[]; abort_rule: L10n; scope_hint: L10n };
  prerequisites: L10n[];
  open_questions: L10n[];
  compliance_flags: string[];
  sources_reviewed_at: string;
  /** Where the task sits in a Leistungsverzeichnis (construction-site tasks). */
  lv?: TaskLvRef | null;
  requirements?: { object_size_m: RequirementEntry<{ min: number; max: number }>; tolerance_mm: RequirementEntry<number>; force_n: RequirementEntry<number> };
};

export type SettingOption = {
  id: string;
  group: SettingGroup;
  title: L10n;
  coverage: Coverage;
  coverage_note: L10n;
  typical_incumbent_automation: string[];
  dust: { type: DustType; typical_zone: DustZone };
  floor: Floor;
  exposure: Exposure;
  seed_priority: number;
  /** Published task records for this setting. */
  records: number;
  /** Construction-site trades: the section and the STLB-Bau / VOB/C reference. */
  section?: SiteSection | null;
  lv?: { lb: string[]; atv: string[] } | null;
};

export type MachineClassOption = { id: string; title: L10n; families: FamilyId[] };

export type LabelMap = Record<string, L10n>;

/** Everything a station page hands to its client island. */
export type JourneyContent = {
  settings: SettingOption[];
  machineClasses: MachineClassOption[];
  families: LabelMap;
  solutionClasses: LabelMap;
  compliance: LabelMap;
  machineClassFamilies: Record<string, readonly FamilyId[]>;
};
