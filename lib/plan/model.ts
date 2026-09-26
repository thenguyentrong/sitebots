import { z } from 'zod';
import { FAMILY_IDS, RULE_STATUS, SOLUTION_CLASS_IDS, VERDICTS, type SolutionClassId } from '@/lib/content/vocab';
import { CompanyContextSchema, emptyContext, type CompanyContext } from '@/lib/context/schema';
import { RequirementSchema, hasAnyRequirement } from '@/lib/match/requirements';
import { FactsSchema, emptyFacts } from '@/lib/screen/facts';
import { CURATED_CONFIDENCE, TASK_CAPABILITIES } from '@/lib/spec/enums';
import { jobById } from './jobs';
import { familyForJob, type LegacySetting } from './legacy';
import { resolvedFactsOf, siteContext } from './screen';

/**
 * A workspace is one company context plus up to twelve projects, one task
 * each. Version 2. The version-one shape (eight jobs, no context) is kept
 * below so lib/plan/migrate.ts can carry an old draft over; nothing else
 * reads it.
 */

const text = z.string().max(4000);
const numberInput = z.string().max(32);
const rating = z.enum(['', 'low', 'medium', 'high']);
export const CostSchema = z.object({
  initial: numberInput.default(''), hours: numberInput.default(''), rate: numberInput.default(''),
  cashShare: numberInput.default(''), annual: numberInput.default(''),
});
export type Costs = z.infer<typeof CostSchema>;
export const OptionSchema = z.object({
  id: z.string().min(1).max(100), name: z.string().min(1).max(160), kind: z.enum(['robot', 'custom']),
  robotId: z.string().uuid().optional(), href: z.string().regex(/^\/robots\/[a-z0-9-]+\/[a-z0-9-]+(?:\?variant=[a-zA-Z0-9_%.-]+)?$/).optional(),
  package: text.default(''), operator: text.default(''), evidence: text.default(''), costs: CostSchema,
});
export type PlanOption = z.infer<typeof OptionSchema>;

const L10nText = z.object({ en: z.string().max(600), de: z.string().max(600).default('') });
/** The copy of a library record a project keeps; see lib/plan/from-task.ts. */
export const TaskSnapshotSchema = z.object({
  id: z.string().max(120), setting: z.string().max(60), family: z.enum(FAMILY_IDS),
  title: L10nText, summary: L10nText,
  facts: FactsSchema,
  meta: z.record(z.string(), z.object({ confidence: z.enum(CURATED_CONFIDENCE), note: z.string().max(600) })).default({}),
  reference_verdict: z.enum(VERDICTS),
  reference_results: z.record(z.string(), z.enum(RULE_STATUS)).default({}),
  better_answer: z.enum(SOLUTION_CLASS_IDS).nullable().default(null),
  solution_classes: z.array(z.enum(SOLUTION_CLASS_IDS)).max(10).default([]),
  capabilities_required: z.array(z.enum(TASK_CAPABILITIES)).default([]),
  pilot_metrics: z.array(z.string().max(60)).default([]),
  compliance_flags: z.array(z.string().max(60)).default([]),
  sources_reviewed_at: z.string().max(10).default(''),
});
export type TaskSnapshot = z.infer<typeof TaskSnapshotSchema>;
export const TaskRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('library'), snapshot: TaskSnapshotSchema }),
  z.object({ kind: z.literal('custom'), family: z.enum([...FAMILY_IDS, ''] as const).default(''), facts: FactsSchema.default(emptyFacts()) }),
]);
export type TaskRef = z.infer<typeof TaskRefSchema>;

const projectBase = {
  id: z.string().uuid(), title: z.string().max(160), jobId: z.string().max(40),
  setting: z.enum(['', 'site', 'factory', 'yard']),
  focus: z.enum(['any', 'humanoid']).default('any'), ideaId: z.string().max(80).default(''), objective: text, baseline: text, description: text,
  needs: z.object({
    payload: numberInput, reach: numberInput, runtime: numberInput,
    terrain: z.enum(['', 'paved', 'gravel', 'rubble', 'mud']),
    stairs: z.enum(['', 'none', 'required']),
    environment: z.enum(['', 'indoor', 'outdoor', 'both']),
    autonomy: z.enum(['', 'teleop_ok', 'supervised', 'autonomous']),
  }),
  variability: rating, value: rating, readiness: rating, rationale: text,
  gate: z.enum(['unknown', 'confirmed', 'blocked']), gateNote: text,
  options: z.array(OptionSchema).max(4), selectedOptionId: z.string().max(100),
  pilot: z.object({ scope: text, success: text, stop: text, owner: z.string().max(160), date: z.string().max(10) }),
};
export const ProjectV1Schema = z.object(projectBase);
export type ProjectV1 = z.infer<typeof ProjectV1Schema>;
export const ProjectSchema = z.object({
  ...projectBase,
  task: TaskRefSchema,
  factOverrides: FactsSchema.partial().default({}),
  solutionClasses: z.array(z.enum(SOLUTION_CLASS_IDS)).max(10).default([]),
  screenConfirmedAt: z.string().max(30).default(''),
});
export type Project = z.infer<typeof ProjectSchema>;

export const WorkspaceV1Schema = z.object({ version: z.literal(1), activeId: z.string().max(100), projects: z.array(ProjectV1Schema).max(12) });
export type WorkspaceV1 = z.infer<typeof WorkspaceV1Schema>;
export const WorkspaceSchema = z.object({
  version: z.literal(2), activeId: z.string().max(100), context: CompanyContextSchema.default(emptyContext()), projects: z.array(ProjectSchema).max(12),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;
export const EMPTY_WORKSPACE: Workspace = { version: 2, activeId: '', context: emptyContext(), projects: [] };
export const emptyCosts = (): Costs => ({ initial: '', hours: '', rate: '', cashShare: '', annual: '' });

export function newProject(id: string, jobId = 'custom', setting: LegacySetting = ''): Project {
  const job = jobById(jobId);
  return {
    id, jobId: job.id, title: job.id === 'custom' ? 'My automation opportunity' : job.title, setting,
    objective: '', baseline: '', description: '', focus: 'any', ideaId: '',
    needs: { payload: '', reach: '', runtime: '', terrain: '', stairs: '', environment: '', autonomy: '' },
    variability: '', value: '', readiness: '', rationale: '', gate: 'unknown', gateNote: '',
    options: [], selectedOptionId: '',
    pilot: { scope: '', success: '', stop: '', owner: '', date: '' },
    task: { kind: 'custom', family: familyForJob(job.id), facts: emptyFacts() },
    factOverrides: {}, solutionClasses: [], screenConfirmedAt: '',
  };
}
export function activeProject(workspace: Workspace | null): Project | undefined {
  return workspace?.projects.find((project) => project.id === workspace.activeId);
}
/** The capabilities the catalogue is asked for: the record's list, or the legacy job's list for a custom task. */
export function tasksOf(project: Project) {
  return project.task.kind === 'library' ? project.task.snapshot.capabilities_required : jobById(project.jobId).tasks;
}
const CATALOGUE_CLASSES: Partial<Record<SolutionClassId, 'humanoid' | 'quadruped' | 'mobile_manipulator'>> = { humanoid: 'humanoid', quadruped_inspection: 'quadruped', mobile_manipulator_wheeled: 'mobile_manipulator' };
export function formFactorFor(project: Project) {
  if (project.focus === 'humanoid') return 'humanoid';
  const catalogue = project.solutionClasses.map((c) => CATALOGUE_CLASSES[c]).filter(Boolean);
  return catalogue.length === 1 ? catalogue[0] : 'any';
}
/**
 * What the matcher receives. Explicit technical inputs win; otherwise the
 * screened facts speak, and a fact nobody established stays out of the
 * request. Never a favourable default.
 */
/** What the matcher is asked for a task: the same facts the site check reads, the record's typical site overridden by the visitor's answers. */
export function requirementsFor(project: Project, context: CompanyContext = siteContext(project)) {
  const numeric = (value: string) => value.trim() === '' ? undefined : Number(value);
  const needs = project.needs;
  const facts = resolvedFactsOf(project, context);
  const mass = facts.object_mass_kg.value;
  const reach = facts.reach_height_m.value;
  const floor = facts.floor.value;
  const zone = facts.dust.value?.zone;
  return RequirementSchema.safeParse({
    tasks: tasksOf(project),
    payload_kg: numeric(needs.payload) ?? (mass && mass.max > 0 ? mass.max : undefined),
    reach_height_m: numeric(needs.reach) ?? (reach && reach.max > 0 ? reach.max : undefined),
    runtime_h_per_shift: numeric(needs.runtime),
    terrain: needs.terrain || (floor === 'level' ? 'paved' : floor === 'uneven' ? 'gravel' : undefined),
    stairs: needs.stairs || (floor === 'stairs' ? 'required' : undefined),
    environment: needs.environment || facts.environment.value || undefined,
    dust: zone === 'zone' || zone === 'atex' ? 'high' : zone === 'controlled' || zone === 'none' ? 'low' : undefined,
    wet: facts.wet.value ?? undefined,
    autonomy: needs.autonomy || undefined,
    region: 'DE', form_factor: formFactorFor(project),
  });
}
export function matchable(project: Project, context?: CompanyContext): boolean {
  const parsed = requirementsFor(project, context);
  return parsed.success && hasAnyRequirement(parsed.data);
}
export function optionForRobot(robot: { id: string; name: string; href: string }): PlanOption {
  return { id: robot.id, robotId: robot.id, name: robot.name, kind: 'robot', href: robot.href, package: '', operator: '', evidence: '', costs: emptyCosts() };
}
export function costResult(costs: Costs, hoursFactor = 1) {
  const keys = ['initial', 'hours', 'rate', 'cashShare', 'annual'] as const;
  const missing = keys.filter((key) => costs[key].trim() === '');
  if (missing.length) return { kind: 'missing' as const, missing };
  const [initial, hours, rate, cashShare, annual] = keys.map((key) => Number(costs[key]));
  if (![initial, hours, rate, cashShare, annual].every((value) => Number.isFinite(value) && value >= 0 && value <= 1e9) || hours > 1000000 || cashShare > 100) {
    return { kind: 'invalid' as const };
  }
  const capacity = hours * hoursFactor * rate;
  const savings = capacity * cashShare / 100;
  const net = savings - annual;
  return { kind: 'ready' as const, initial, capacity, savings, net, payback: net > 0 ? initial / net : null, years: Array.from({ length: 6 }, (_, year) => ({ year, cash: -initial + year * net })) };
}
export const euro = (amount: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
export function nextAction(project: Project, blocked = false, openEvidence = false): string {
  if (blocked || project.gate === 'blocked') return 'Resolve the blocker or compare another configuration.';
  if (project.gate !== 'confirmed' || openEvidence) return 'Confirm critical requirements with the supplier and a representative test before committing to a pilot.';
  if (!project.value || !project.readiness) return 'Assess business value and deployment readiness before prioritizing investment.';
  if (project.value === 'low') return 'Check whether improving the existing process is sufficient before investing.';
  if (project.readiness === 'low') return 'Investigate the most important unknowns and compare simpler solutions.';
  return 'Scope a bounded pilot with measurable acceptance criteria before a purchase decision.';
}
