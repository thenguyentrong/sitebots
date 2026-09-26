import { z } from 'zod';
import { CURATED_CONFIDENCE, FORM_FACTORS, TASK_CAPABILITIES } from '@/lib/spec/enums';
import {
  COVERAGE,
  DATA_SENSITIVITY,
  DUST_TYPES,
  DUST_ZONES,
  ERROR_TOLERANCE,
  EVIDENCE_KINDS,
  EVIDENCE_TYPES,
  EXPOSURES,
  FAMILY_IDS,
  FLOORS,
  INCUMBENT_STATUS,
  LV_UNITS,
  RECORD_STATUS,
  RULE_IDS,
  RULE_STATUS,
  SAFETY_CRITICALITY,
  SETTING_GROUPS,
  SITE_SECTIONS,
  SOLUTION_CLASS_IDS,
  VALUE_DRIVERS,
  VARIABILITY,
  VERDICTS,
  WET_LEVELS,
} from './vocab';

/**
 * data/tasks, data/settings and data/taxonomy — the decision-journey content.
 *
 * Every attribute of a task is a provenance entry like the curated robot layer: a
 * value (or null for a documented gap), a confidence, a note that says where the
 * value comes from, and an evidence URL wherever there is one. `confirmed` needs the
 * URL. Text fields are {en, de}; German may be empty in a draft, never in a
 * published record (lib/content/l10n.ts missingGerman()).
 */

export const L10n = z.object({ en: z.string().trim().min(1), de: z.string().trim().default('') });
export const L10nList = z.array(L10n).default([]);

export const Slug = z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'snake_case id expected');
export const KebabSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'kebab-case slug expected');
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD expected');
export const HttpsUrl = z.url().refine((u) => u.startsWith('https://'), 'https URL expected');

/** A value with its provenance. The note is mandatory: an attribute without a reason is a guess. */
export function prov<T extends z.ZodTypeAny>(value: T) {
  return z
    .object({ value, confidence: z.enum(CURATED_CONFIDENCE), evidence_url: HttpsUrl.optional(), note: z.string().trim().min(1) })
    .superRefine((entry, ctx) => {
      if (entry.confidence === 'confirmed' && !entry.evidence_url) {
        ctx.addIssue({ code: 'custom', path: ['evidence_url'], message: '"confirmed" needs an evidence_url' });
      }
    });
}
export type ProvEntry<T> = { value: T; confidence: (typeof CURATED_CONFIDENCE)[number]; evidence_url?: string; note: string };

export const Range = z.object({ min: z.number().min(0), max: z.number().min(0) }).refine((r) => r.max >= r.min, 'max must not be below min');

/** Where a trade sits in a German LV: STLB-Bau Leistungsbereich numbers and the VOB/C ATV that governs it. */
export const LvRef = z.object({
  lb: z.array(z.string().regex(/^\d{3}$/, 'three-digit LB number expected')).default([]),
  atv: z.array(z.string().regex(/^DIN \d{5}$/, '"DIN 18340" expected')).default([]),
});

/** The LV position a task belongs to, so a contractor finds it in their own Leistungsverzeichnis. */
export const TaskLv = z.object({
  lb: z.string().regex(/^\d{3}$/, 'three-digit LB number expected').nullable(),
  atv: z.string().regex(/^DIN \d{5}$/, '"DIN 18340" expected').nullable(),
  position: L10n,
  unit: z.enum(LV_UNITS),
});

/**
 * What the task demands of whoever does it, beyond the screen inputs: object size,
 * the tolerance the result must meet and the force the work takes. Each value is a
 * provenance entry; null with a note is an honest gap.
 */
export const TaskRequirements = z.object({
  object_size_m: prov(Range.nullable()).optional(),
  tolerance_mm: prov(z.number().min(0).nullable()).optional(),
  force_n: prov(z.number().min(0).nullable()).optional(),
});

/**
 * Screen inputs. All thirteen are required on every record, even when the value is
 * null: the note then says why the gap exists and what a visitor should measure.
 */
export const TaskAttributes = z.object({
  object_mass_kg: prov(Range.nullable()),
  variability: prov(z.enum(VARIABILITY).nullable()),
  error_tolerance: prov(z.enum(ERROR_TOLERANCE).nullable()),
  safety_criticality: prov(z.enum(SAFETY_CRITICALITY).nullable()),
  reach_height_m: prov(Range.nullable()),
  environment: prov(z.enum(EXPOSURES).nullable()),
  dust: prov(z.object({ type: z.enum(DUST_TYPES), zone: z.enum(DUST_ZONES) }).nullable()),
  wet: prov(z.enum(WET_LEVELS).nullable()),
  floor: prov(z.enum(FLOORS).nullable()),
  incumbent_automation: prov(z.object({ status: z.enum(INCUMBENT_STATUS), machine_classes: z.array(Slug).default([]) }).nullable()),
  data_sensitivity: prov(z.enum(DATA_SENSITIVITY).nullable()),
  runtime_continuous_min: prov(z.number().min(0).nullable()),
  cycle_or_volume: prov(z.string().nullable()),
});
export type TaskAttributes = z.infer<typeof TaskAttributes>;

export const Evidence = z.object({
  statement: L10n,
  url: HttpsUrl,
  kind: z.enum(EVIDENCE_KINDS),
  tier: z.number().int().min(0).max(4),
  date: IsoDate,
  type: z.enum(EVIDENCE_TYPES),
  subject: z.object({ maker: KebabSlug, model: KebabSlug }).nullable().default(null),
  confidence: z.enum(CURATED_CONFIDENCE),
  note: z.string().optional(),
});
export type Evidence = z.infer<typeof Evidence>;

const Status = z.enum(RULE_STATUS);
/** The authored reference verdict. The content check recomputes it with the engine and the two must agree. */
export const ScreenPin = z.object({
  verdict: z.enum(VERDICTS),
  results: z.object({
    T1_mass: Status,
    T2_dust: Status,
    T3_incumbent: Status,
    T4_variability: Status,
    T5_failure_tolerance: Status,
    X1_reach: Status,
    X2_outdoor: Status,
    X3_data: Status,
    X4_runtime: Status,
    X5_atex: Status,
  }),
  killed_by: z.array(z.enum(RULE_IDS)).default([]),
  better_answer: z.object({ class: z.enum(SOLUTION_CLASS_IDS).nullable(), note: L10n }),
  screened_at: IsoDate,
  screened_by: z.literal('sitebots'),
});

export const TaskRecord = z
  .object({
    schema_version: z.literal(1),
    id: z.string().regex(/^[a-z0-9_]+\/[a-z0-9]+(?:-[a-z0-9]+)*$/, '"<setting>/<task-slug>" expected'),
    status: z.enum(RECORD_STATUS).default('published'),
    setting: Slug,
    family: z.enum(FAMILY_IDS),
    trades: z.array(Slug).default([]),
    title: L10n,
    summary: L10n,
    description: L10n,
    also_in_settings: z.array(Slug).default([]),
    derived_from: z.string().nullable().default(null),
    lv: TaskLv.optional(),
    attributes: TaskAttributes,
    requirements: TaskRequirements.default({}),
    screen: ScreenPin,
    value_drivers: z.array(z.enum(VALUE_DRIVERS)).default([]),
    capabilities_required: z.array(z.enum(TASK_CAPABILITIES)).default([]),
    capabilities_optional: z.array(z.enum(TASK_CAPABILITIES)).default([]),
    solution_classes: z.array(z.enum(SOLUTION_CLASS_IDS)).default([]),
    evidence: z.array(Evidence).default([]),
    pilot: z.object({ metrics: z.array(Slug).default([]), abort_rule: L10n, scope_hint: L10n }),
    prerequisites: L10nList,
    open_questions: L10nList,
    compliance_flags: z.array(Slug).default([]),
    sources_reviewed_at: IsoDate,
  })
  .superRefine((t, ctx) => {
    if (t.id.split('/')[0] !== t.setting) ctx.addIssue({ code: 'custom', path: ['id'], message: `id must start with "${t.setting}/"` });
    if (t.attributes.variability.value !== null && !/judg|einsch/i.test(t.attributes.variability.note)) {
      ctx.addIssue({ code: 'custom', path: ['attributes', 'variability', 'note'], message: 'variability is an analyst judgement; say so in the note' });
    }
    if (t.screen.verdict === 'candidate' && t.evidence.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['evidence'], message: 'a candidate needs at least one evidence entry' });
    }
    if (t.screen.verdict === 'ruled_out') {
      if (!t.screen.better_answer.class) ctx.addIssue({ code: 'custom', path: ['screen', 'better_answer', 'class'], message: 'a ruled-out task names its better answer' });
      if (t.screen.killed_by.length === 0) ctx.addIssue({ code: 'custom', path: ['screen', 'killed_by'], message: 'a ruled-out task lists the rules that failed' });
    } else if (t.screen.killed_by.length) {
      ctx.addIssue({ code: 'custom', path: ['screen', 'killed_by'], message: 'killed_by is only set on a ruled-out task' });
    }
    if (t.derived_from && t.screen.verdict !== 'unscreened') {
      ctx.addIssue({ code: 'custom', path: ['derived_from'], message: 'a derived record stays unscreened until it is re-screened in its own setting' });
    }
  });
export type TaskRecord = z.infer<typeof TaskRecord>;

export const ProcessStep = z.object({ id: Slug, label: L10n });

export const SettingRecord = z.object({
  id: Slug,
  group: z.enum(SETTING_GROUPS),
  section: z.enum(SITE_SECTIONS).optional(),
  lv: LvRef.optional(),
  title: L10n,
  aliases: z.object({ en: z.array(z.string()).default([]), de: z.array(z.string()).default([]) }).default({ en: [], de: [] }),
  coverage: z.enum(COVERAGE),
  coverage_note: L10n,
  typical_incumbent_automation: z.array(Slug).default([]),
  dust: z.object({ type: z.enum(DUST_TYPES), typical_zone: z.enum(DUST_ZONES), note: L10n }),
  floor: z.enum(FLOORS),
  exposure: z.enum(EXPOSURES),
  typical_trades: z.array(Slug).default([]),
  process_steps: z.array(ProcessStep).default([]),
  seed_priority: z.number().int().min(1).max(9),
  sources: z.array(HttpsUrl).default([]),
  status: z.enum(RECORD_STATUS).default('published'),
});
export type SettingRecord = z.infer<typeof SettingRecord>;

export const FamilyRecord = z.object({
  id: z.enum(FAMILY_IDS),
  title: L10n,
  question: L10n,
  capabilities: z.array(z.enum(TASK_CAPABILITIES)).default([]),
  verdict_note: L10n,
});
export type FamilyRecord = z.infer<typeof FamilyRecord>;

export const TradeRecord = z.object({ id: Slug, title: L10n });
export type TradeRecord = z.infer<typeof TradeRecord>;

/** Incumbent automation vocabulary. `families` says which task families a class covers, which is how a visitor's "we run X" answers test 3. */
export const MachineClassRecord = z.object({ id: Slug, title: L10n, families: z.array(z.enum(FAMILY_IDS)).default([]), note: L10n.optional() });
export type MachineClassRecord = z.infer<typeof MachineClassRecord>;

export const SolutionClassRecord = z.object({
  id: z.enum(SOLUTION_CLASS_IDS),
  title: L10n,
  catalogue_form_factor: z.enum(FORM_FACTORS).nullable().default(null),
  when_it_wins: L10n,
  supplier_questions: L10nList,
  regulatory_note: L10n,
  typical_price_band: prov(z.object({ min: z.number().min(0), max: z.number().min(0), currency: z.literal('EUR') }).nullable()),
});
export type SolutionClassRecord = z.infer<typeof SolutionClassRecord>;

export const FamiliesFile = z.object({ families: z.array(FamilyRecord) });
export const TradesFile = z.object({ trades: z.array(TradeRecord) });
export const MachineClassesFile = z.object({ machine_classes: z.array(MachineClassRecord) });
export const SolutionClassesFile = z.object({ solution_classes: z.array(SolutionClassRecord) });
