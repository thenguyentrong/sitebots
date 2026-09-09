import { z } from 'zod';
import { CERTIFICATIONS, CURATED_CONFIDENCE, HAND_TYPES, REQUIRES_OPERATOR, TASK_CAPABILITIES } from '@/lib/spec/enums';
import { PART_SCHEMAS } from '@/lib/spec/parts';

/**
 * data/curated/{manufacturer}/{model}.yaml — the construction layer.
 *
 * No public source says whether a humanoid may work outdoors, climbs stairs
 * or carries a CE mark. These files do, with a confidence and a note on
 * every entry, and an evidence URL wherever there is one. `confirmed` needs
 * evidence; `likely` is an inference the note explains; `assumed` is a
 * working assumption a buyer should check. All three are shown as such.
 */

const Entry = z.object({
  value: z.unknown(),
  confidence: z.enum(CURATED_CONFIDENCE),
  evidence_url: z.url().optional(),
  note: z.string().optional(),
});
export type CuratedEntry = z.infer<typeof Entry>;

const Deployment = z.object({
  site: z.string(),
  year: z.number().int().optional(),
  url: z.url().optional(),
  note: z.string().optional(),
});

/** Per-field value shapes. Anything else in `entries` is rejected with its path. */
export const FIELD_VALUE: Record<string, z.ZodTypeAny> = {
  ip_rating: z.string().regex(/^IP[0-6X][0-9X]$/).nullable(),
  operating_temp_c: z.object({ min_c: z.number(), max_c: z.number() }).nullable(),
  stair_capable: z.boolean().nullable(),
  max_slope_deg: z.number().min(0).max(60).nullable(),
  step_height_m: z.number().min(0).max(1).nullable(),
  outdoor_rated: z.boolean().nullable(),
  certifications: z.array(z.enum(CERTIFICATIONS)),
  task_capabilities: z.array(z.enum(TASK_CAPABILITIES)),
  requires_operator: z.enum(REQUIRES_OPERATOR).nullable(),
  deployment_evidence: z.array(Deployment),
  trl: z.number().int().min(1).max(9).nullable(),
  noise_db: z.number().min(0).max(140).nullable(),
  reach_m: z.number().min(0).max(5).nullable(),
  hot_swap: z.boolean().nullable(),
  collaborative: z.boolean().nullable(),
  // built-in parts and equipment — structured items validated in lib/spec/parts.ts
  ...PART_SCHEMAS,
  hand_type: z.enum(HAND_TYPES).nullable(),
  hand_model: z.string().nullable(),
  finger_count: z.number().int().min(0).max(10).nullable(),
  compute_module: z.string().nullable(),
  compute_tops: z.number().min(0).nullable(),
  has_lidar: z.boolean().nullable(),
  lidar_model: z.string().nullable(),
  cameras: z.string().nullable(),
  force_torque: z.boolean().nullable(),
  connectivity: z.string().nullable(),
  battery_wh: z.number().min(0).nullable(),
};

export const CuratedFile = z
  .object({
    manufacturer: z.string(),
    model: z.string(),
    variants: z.array(z.string()).default(['base']),
    entries: z.record(z.string(), Entry).default({}),
    by_variant: z.record(z.string(), z.record(z.string(), Entry)).default({}),
  })
  .superRefine((file, ctx) => {
    const check = (field: string, entry: CuratedEntry, path: (string | number)[]) => {
      const shape = FIELD_VALUE[field];
      if (!shape) {
        ctx.addIssue({ code: 'custom', path, message: `unknown curated field "${field}"` });
        return;
      }
      const res = shape.safeParse(entry.value);
      if (!res.success) ctx.addIssue({ code: 'custom', path: [...path, 'value'], message: res.error.issues[0]?.message ?? 'invalid value' });
      if (entry.confidence === 'confirmed' && !entry.evidence_url) {
        ctx.addIssue({ code: 'custom', path: [...path, 'evidence_url'], message: '"confirmed" needs an evidence_url' });
      }
    };
    for (const [field, entry] of Object.entries(file.entries)) check(field, entry, ['entries', field]);
    for (const [variant, entries] of Object.entries(file.by_variant)) {
      if (!file.variants.includes(variant)) ctx.addIssue({ code: 'custom', path: ['by_variant', variant], message: `variant not listed in "variants"` });
      for (const [field, entry] of Object.entries(entries)) check(field, entry, ['by_variant', variant, field]);
    }
  });
export type CuratedFile = z.infer<typeof CuratedFile>;

/** confirmed 0.9 · likely 0.7 · assumed 0.4 — what the merge step reads as confidence. */
export const CONFIDENCE_VALUE: Record<string, number> = { confirmed: 0.9, likely: 0.7, assumed: 0.4 };
