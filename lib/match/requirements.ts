import { z } from 'zod';
import { CERTIFICATIONS, FORM_FACTORS, TASK_CAPABILITIES } from '@/lib/spec/enums';

/**
 * What a site asks of a robot. Every field is optional except the defaults,
 * so a one-line question ("12 kg up the stairs") is a valid requirement set.
 * The same schema validates the form, the API body and, later, what the
 * free-text parser produces.
 */
export const TERRAINS = ['paved', 'gravel', 'rubble', 'mud'] as const;
export const ENVIRONMENTS = ['indoor', 'outdoor', 'both'] as const;
export const DUST = ['low', 'high'] as const;
export const WET = ['dry', 'damp', 'rain'] as const;
export const AUTONOMY = ['teleop_ok', 'supervised', 'autonomous'] as const;
export const MATCH_REGIONS = ['DE', 'FR', 'NL', 'AT', 'CH', 'UK', 'EU'] as const;

export const RequirementSchema = z.object({
  tasks: z.array(z.enum(TASK_CAPABILITIES)).default([]),
  payload_kg: z.number().positive().max(2000).optional(),
  reach_height_m: z.number().positive().max(10).optional(),
  terrain: z.enum(TERRAINS).default('paved'),
  stairs: z.enum(['none', 'required']).default('none'),
  slope_deg: z.number().min(0).max(60).optional(),
  environment: z.enum(ENVIRONMENTS).default('indoor'),
  dust: z.enum(DUST).default('low'),
  wet: z.enum(WET).default('dry'),
  temp_min_c: z.number().min(-60).max(80).optional(),
  temp_max_c: z.number().min(-60).max(80).optional(),
  runtime_h_per_shift: z.number().positive().max(24).optional(),
  hot_swap_acceptable: z.boolean().default(true),
  budget_eur: z.number().positive().optional(),
  region: z.enum(MATCH_REGIONS).default('DE'),
  needed_by: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  form_factor: z.enum(['any', ...FORM_FACTORS]).default('any'),
  autonomy: z.enum(AUTONOMY).default('teleop_ok'),
  certifications_required: z.array(z.enum(CERTIFICATIONS)).default([]),
  noise_limit_db: z.number().positive().max(140).optional(),
  strict_unknowns: z.boolean().default(false),
});
export type Requirements = z.infer<typeof RequirementSchema>;

export const DEFAULT_REQUIREMENTS: Requirements = RequirementSchema.parse({});

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s === undefined || s === '' ? undefined : s;
}

function list(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.flatMap((s) => s.split(',')).map((s) => s.trim()).filter(Boolean);
}

function num(v: string | string[] | undefined): number | undefined {
  const s = first(v);
  if (s === undefined) return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function bool(v: string | string[] | undefined, dflt: boolean): boolean {
  const s = first(v);
  if (s === undefined) return dflt;
  return /^(1|true|on|yes)$/i.test(s);
}

/**
 * Query string → Requirements. A GET form is the whole UI, so results are a
 * link. Bad values fall back to the default and are reported, not fatal.
 */
export function requirementsFromParams(sp: RawParams): { req: Requirements; issues: string[]; asked: boolean } {
  const candidate = {
    tasks: list(sp.tasks),
    payload_kg: num(sp.payload_kg),
    reach_height_m: num(sp.reach_height_m),
    terrain: first(sp.terrain),
    stairs: first(sp.stairs),
    slope_deg: num(sp.slope_deg),
    environment: first(sp.environment),
    dust: first(sp.dust),
    wet: first(sp.wet),
    temp_min_c: num(sp.temp_min_c),
    temp_max_c: num(sp.temp_max_c),
    runtime_h_per_shift: num(sp.runtime_h_per_shift),
    hot_swap_acceptable: bool(sp.hot_swap_acceptable, true),
    budget_eur: num(sp.budget_eur),
    region: first(sp.region),
    needed_by: first(sp.needed_by),
    form_factor: first(sp.form_factor),
    autonomy: first(sp.autonomy),
    certifications_required: list(sp.certifications_required),
    noise_limit_db: num(sp.noise_limit_db),
    strict_unknowns: bool(sp.strict_unknowns, false),
  };
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(candidate)) if (v !== undefined) cleaned[k] = v;

  const parsed = RequirementSchema.safeParse(cleaned);
  if (parsed.success) return { req: parsed.data, issues: [], asked: Object.keys(sp).length > 0 };

  // Drop the offending fields one by one and keep the rest.
  const issues: string[] = [];
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0]);
    issues.push(`${key}: ${issue.message}`);
    delete cleaned[key];
  }
  return { req: RequirementSchema.parse(cleaned), issues, asked: Object.keys(sp).length > 0 };
}

/** True when the visitor asked for something beyond the defaults. */
export function hasAnyRequirement(req: Requirements): boolean {
  const d = DEFAULT_REQUIREMENTS;
  return (
    req.tasks.length > 0 ||
    req.payload_kg !== undefined ||
    req.reach_height_m !== undefined ||
    req.terrain !== d.terrain ||
    req.stairs !== d.stairs ||
    req.slope_deg !== undefined ||
    req.environment !== d.environment ||
    req.dust !== d.dust ||
    req.wet !== d.wet ||
    req.temp_min_c !== undefined ||
    req.temp_max_c !== undefined ||
    req.runtime_h_per_shift !== undefined ||
    req.budget_eur !== undefined ||
    req.needed_by !== undefined ||
    req.form_factor !== d.form_factor ||
    req.autonomy !== d.autonomy ||
    req.certifications_required.length > 0 ||
    req.noise_limit_db !== undefined
  );
}
