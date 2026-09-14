import { z } from 'zod';
import { RequirementSchema, hasAnyRequirement } from '@/lib/match/requirements';
import { jobById } from './jobs';

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
export const ProjectSchema = z.object({
  id: z.string().uuid(), title: z.string().max(160), jobId: z.string().max(40),
  setting: z.enum(['', 'site', 'factory', 'yard']), objective: text, baseline: text, description: text,
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
});
export type Project = z.infer<typeof ProjectSchema>;
export const WorkspaceSchema = z.object({
  version: z.literal(1), activeId: z.string().max(100), projects: z.array(ProjectSchema).max(12),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;
export const EMPTY_WORKSPACE: Workspace = { version: 1, activeId: '', projects: [] };
export const emptyCosts = (): Costs => ({ initial: '', hours: '', rate: '', cashShare: '', annual: '' });
export function newProject(id: string, jobId = 'custom', setting: Project['setting'] = ''): Project {
  const job = jobById(jobId);
  return {
    id, jobId: job.id, title: job.id === 'custom' ? 'My automation opportunity' : job.title, setting,
    objective: '', baseline: '', description: '',
    needs: { payload: '', reach: '', runtime: '', terrain: '', stairs: '', environment: '', autonomy: '' },
    variability: '', value: '', readiness: '', rationale: '', gate: 'unknown', gateNote: '',
    options: [], selectedOptionId: '',
    pilot: { scope: '', success: '', stop: '', owner: '', date: '' },
  };
}
export function activeProject(workspace: Workspace | null): Project | undefined {
  return workspace?.projects.find((project) => project.id === workspace.activeId);
}
export function requirementsFor(project: Project) {
  const numeric = (value: string) => value.trim() === '' ? undefined : Number(value);
  const needs = project.needs;
  return RequirementSchema.safeParse({
    tasks: jobById(project.jobId).tasks,
    payload_kg: numeric(needs.payload), reach_height_m: numeric(needs.reach), runtime_h_per_shift: numeric(needs.runtime),
    terrain: needs.terrain || undefined, stairs: needs.stairs || undefined,
    environment: needs.environment || undefined, autonomy: needs.autonomy || undefined,
    region: 'DE',
  });
}
export function matchable(project: Project): boolean {
  const parsed = requirementsFor(project);
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
