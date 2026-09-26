import { z } from 'zod';
import { CURATED_CONFIDENCE, FORM_FACTORS } from '@/lib/spec/enums';
import { HttpsUrl, IsoDate, L10n, L10nList, Slug } from './schema';
import {
  COMPLIANCE_KINDS,
  COMPLIANCE_STATUS,
  COMPLIANCE_TRIGGERS,
  COST_BLOCKS,
  COST_UNITS,
  DUST_TYPES,
  LIMIT_BASIS,
  PARTNER_TYPES,
  ROADMAP_OWNERS,
  SCENARIOS,
  SETTING_GROUPS,
} from './vocab';

/**
 * data/compliance, data/costs, data/reference and data/partners — what the
 * Implementation station renders. Content, not product data: the tier scale is
 * 0 sitebots assessment · 1 primary legal text, standards body, authority ·
 * 2 professional body, insurer, chamber, research institute · 3 press,
 * consultancy · 4 estimate. Nothing here is prefilled into a visitor's numbers.
 */

export const Provenance = z
  .object({
    source_url: HttpsUrl,
    tier: z.number().int().min(0).max(4),
    observed_at: IsoDate,
    confidence: z.enum(CURATED_CONFIDENCE),
    note: L10n.optional(),
  })
  .refine((p) => p.confidence !== 'confirmed' || p.tier <= 2, { message: '"confirmed" needs a tier 0–2 source', path: ['tier'] });
export type Provenance = z.infer<typeof Provenance>;

/** When an entry applies. Missing = always. The station hides an entry only when the context contradicts it; "not sure" keeps it visible. */
export const Applicability = z.object({
  setting_groups: z.array(z.enum(SETTING_GROUPS)).optional(),
  dust_zone: z.literal(true).optional(),
  dust_types: z.array(z.enum(DUST_TYPES)).optional(),
  import_origin: z.literal('non_eu').optional(),
  self_learning: z.literal(true).optional(),
  works_council: z.literal(true).optional(),
  cameras_on_people: z.literal(true).optional(),
  legged: z.literal(true).optional(),
  form_factors: z.array(z.enum(FORM_FACTORS)).optional(),
});
export type Applicability = z.infer<typeof Applicability>;

const Reference = z.object({ label: L10n, provenance: Provenance });

export const CostLineTemplate = z
  .object({
    id: z.string().regex(/^[abcd]\.[a-z0-9_]+$/),
    block: z.enum(COST_BLOCKS),
    label: L10n,
    note: L10n,
    unit: z.enum(COST_UNITS),
    recurring: z.boolean(),
    mandatory: z.boolean(),
    typical_range: z
      .object({ low: z.number().min(0), high: z.number().min(0), currency: z.literal('EUR'), basis: L10n, provenance: Provenance })
      .nullable()
      .default(null),
    references: z.array(Reference).default([]),
    applies_when: Applicability.optional(),
    scenarios: z.array(z.enum(SCENARIOS)).default([...SCENARIOS]),
    default_quantity: z.partialRecord(z.enum(SCENARIOS), z.number().positive()).optional(),
  })
  .refine((l) => l.id.startsWith(l.block.toLowerCase() + '.'), { message: 'id prefix must match the block letter', path: ['id'] })
  .refine((l) => !l.typical_range || l.typical_range.high >= l.typical_range.low, { message: 'high must not be below low', path: ['typical_range'] });
export type CostLineTemplate = z.infer<typeof CostLineTemplate>;

export const ScenarioPreset = z.object({ id: z.enum(SCENARIOS), label: L10n, description: L10n, provenance: Provenance });
export const RuleOfThumb = z.object({
  id: Slug,
  label: L10n,
  value: z.object({ min: z.number(), max: z.number() }),
  unit: z.string().min(1),
  note: L10n,
  provenance: Provenance,
});

export const CostBlocksFile = z
  .object({
    blocks: z.array(z.object({ id: z.enum(COST_BLOCKS), title: L10n, note: L10n })),
    lines: z.array(CostLineTemplate),
    scenarios: z.array(ScenarioPreset),
    rules_of_thumb: z.array(RuleOfThumb).default([]),
  })
  .superRefine((f, ctx) => {
    const blockIds = f.blocks.map((b) => b.id);
    for (const id of COST_BLOCKS) if (!blockIds.includes(id)) ctx.addIssue({ code: 'custom', path: ['blocks'], message: `block ${id} missing` });
    const seen = new Set<string>();
    f.lines.forEach((l, i) => {
      if (seen.has(l.id)) ctx.addIssue({ code: 'custom', path: ['lines', i, 'id'], message: `duplicate line id ${l.id}` });
      seen.add(l.id);
    });
    const scenarioIds = f.scenarios.map((s) => s.id);
    for (const id of SCENARIOS) if (!scenarioIds.includes(id)) ctx.addIssue({ code: 'custom', path: ['scenarios'], message: `scenario ${id} missing` });
  });
export type CostBlocksFile = z.infer<typeof CostBlocksFile>;

export const RoadmapPhase = z
  .object({
    id: Slug,
    month_from: z.number().int().min(0),
    month_to: z.number().int().min(0),
    title: L10n,
    activities: z.array(z.object({ id: Slug, text: L10n, owner: z.enum(ROADMAP_OWNERS) })).min(1),
    bottleneck: L10n.optional(),
    decision: L10n.optional(),
    provenance: Provenance,
  })
  .refine((p) => p.month_to >= p.month_from, { message: 'month_to must not be before month_from', path: ['month_to'] });
export type RoadmapPhase = z.infer<typeof RoadmapPhase>;

export const AbortTemplate = z.object({
  metric_id: Slug,
  comparator: z.enum(['<', '>']),
  threshold: z.number(),
  window_months: z.number().int().positive(),
  action: L10n,
  provenance: Provenance,
});

export const RoadmapFile = z.object({ phases: z.array(RoadmapPhase).min(1), abort_template: AbortTemplate, notes: L10nList });
export type RoadmapFile = z.infer<typeof RoadmapFile>;

export const PilotMetric = z.object({
  id: Slug,
  label: L10n,
  unit: z.string().min(1),
  better: z.enum(['higher', 'lower']),
  needs_baseline: z.boolean(),
  definition: L10n,
});
export type PilotMetric = z.infer<typeof PilotMetric>;
export const PilotMetricsFile = z.object({ metrics: z.array(PilotMetric).min(1) });

export const RfiItem = z.object({
  id: z.string().regex(/^rfi\.\d{2}$/),
  order: z.number().int().min(1).max(10),
  title: L10n,
  why: L10n,
  good_answer: L10n,
  fail_if: L10n.optional(),
  references: z.array(Reference).default([]),
  applies_when: Applicability.optional(),
});
export type RfiItem = z.infer<typeof RfiItem>;
export const RfiFile = z
  .object({ items: z.array(RfiItem).length(10) })
  .refine((f) => [...f.items].map((i) => i.order).sort((a, b) => a - b).join() === '1,2,3,4,5,6,7,8,9,10', 'ten items ordered 1–10');

export const ComplianceEntry = z
  .object({
    id: Slug,
    kind: z.enum(COMPLIANCE_KINDS),
    jurisdiction: z.enum(['EU', 'DE']),
    term_de: z.string().min(1),
    term_en: z.string().min(1),
    official_reference: z.string().min(1),
    url: HttpsUrl,
    applies_from: IsoDate.nullable().default(null),
    status: z.enum(COMPLIANCE_STATUS),
    triggers: z.array(z.enum(COMPLIANCE_TRIGGERS)).min(1),
    what_it_means: L10n,
    consequence: L10n,
    action: L10n,
    watch: L10n.optional(),
    provenance: Provenance,
  })
  .refine((e) => e.status !== 'upcoming' || e.applies_from, { message: 'an upcoming entry carries its date', path: ['applies_from'] });
export type ComplianceEntry = z.infer<typeof ComplianceEntry>;

export const HumanoidLimit = z
  .object({
    id: Slug,
    label: L10n,
    value: z.string().min(1),
    /** The number alone, for a stat tile. */
    figure: z.string().max(40).optional(),
    basis: z.enum(LIMIT_BASIS),
    evidence_url: HttpsUrl.optional(),
    confidence: z.enum(CURATED_CONFIDENCE),
    checked_at: IsoDate,
    note: L10n,
  })
  .refine((l) => l.confidence !== 'confirmed' || l.evidence_url, { message: '"confirmed" needs an evidence_url', path: ['evidence_url'] });
export type HumanoidLimit = z.infer<typeof HumanoidLimit>;
export const HumanoidLimitsFile = z.object({ limits: z.array(HumanoidLimit).min(1) });

/** Adjectives a partner entry may only carry when the note quotes the source line that says so. */
const CLAIM_WORDS = /\b(free|kostenlos|kostenfrei|neutral|leading|f(?:ü|ue)hrend|best|beste[rsn]?)\b/i;
export const Partner = z
  .object({
    id: Slug,
    type: z.enum(PARTNER_TYPES),
    name: z.string().min(1).max(160),
    region: z.array(z.string().min(2).max(8)).min(1),
    offers: L10n,
    url: HttpsUrl,
    provenance: Provenance,
    verification: z.enum(['direct', 'indexed']),
    applies_when: Applicability.optional(),
    note: L10n.optional(),
  })
  .refine((p) => !(CLAIM_WORDS.test(p.offers.en) || CLAIM_WORDS.test(p.offers.de)) || Boolean(p.note), {
    message: 'free/neutral/leading/best need a note that quotes the source',
    path: ['offers'],
  });
export type Partner = z.infer<typeof Partner>;
export const PartnersFile = z.object({ partners: z.array(Partner) });
