import { emptyContext, toScreenContext, type CompanyContext } from '@/lib/context/schema';
import type { FamilyId } from '@/lib/content/vocab';
import { resolveFacts, screen } from '@/lib/screen/engine';
import type { Facts } from '@/lib/screen/facts';
import type { FactKey, FactSource, ResolvedFacts, ScreenContext, ScreenOptions, ScreenResult, TaskFacts } from '@/lib/screen/types';
import { familyForJob } from './legacy';
import type { Project } from './model';

/**
 * Screening a saved project. Library tasks bring their record facts; a custom
 * task is the visitor's own description, so its facts count as visitor
 * answers and are never guarded by the record's setting.
 */

export type MachineClassFamilies = Record<string, readonly FamilyId[]>;

/** The facts the visitor actually answered; a stored project keeps every key, most of them null. */
export const answeredKeys = (facts: Partial<Facts>): FactKey[] => (Object.keys(facts) as FactKey[]).filter((key) => facts[key] !== null && facts[key] !== undefined);

export function familyOf(project: Project): FamilyId | '' {
  return project.task.kind === 'library' ? project.task.snapshot.family : project.task.family || familyForJob(project.jobId);
}

function definedOnly(facts: Facts): Partial<TaskFacts> {
  return Object.fromEntries(Object.entries(facts).filter(([, value]) => value !== null && value !== undefined)) as Partial<TaskFacts>;
}

function inputsOf(project: Project): { source: FactSource; overrides: Partial<TaskFacts> } {
  if (project.task.kind === 'library') {
    const s = project.task.snapshot;
    return { source: { setting: s.setting, facts: s.facts, meta: s.meta }, overrides: project.factOverrides };
  }
  return { source: { setting: null, facts: {} }, overrides: { ...definedOnly(project.task.facts), ...project.factOverrides } };
}

function optionsOf(project: Project, machineClassFamilies: MachineClassFamilies): ScreenOptions {
  return { family: familyOf(project) || 'assembly_fastening', forClass: 'humanoid', solutionClasses: project.solutionClasses, machineClassFamilies };
}

export function resolvedFactsOf(project: Project, context: CompanyContext, machineClassFamilies: MachineClassFamilies = {}): ResolvedFacts {
  const ctx: ScreenContext = toScreenContext(context);
  const { source, overrides } = inputsOf(project);
  return resolveFacts(source, overrides, ctx, optionsOf(project, machineClassFamilies));
}

export function screenProject(project: Project, context: CompanyContext, machineClassFamilies: MachineClassFamilies = {}): ScreenResult {
  const ctx: ScreenContext = toScreenContext(context);
  const opts = optionsOf(project, machineClassFamilies);
  const { source, overrides } = inputsOf(project);
  return screen(resolveFacts(source, overrides, ctx, opts), ctx, opts);
}

/**
 * The site check. A library task is screened in its own setting, so the
 * record stands in for a typical site and the visitor's answers override it;
 * a custom task has no record and only the visitor's answers count. No
 * company questionnaire is involved.
 */
export function siteContext(project: Project): CompanyContext {
  return { ...emptyContext(), subSetting: project.task.kind === 'library' ? project.task.snapshot.setting : '' };
}

export function screenForSite(project: Project, machineClassFamilies: MachineClassFamilies = {}): ScreenResult {
  return screenProject(project, siteContext(project), machineClassFamilies);
}
