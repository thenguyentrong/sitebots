import type { MachineClassRecord, TaskRecord } from '@/lib/content/schema';
import type { FamilyId, SolutionClassId } from '@/lib/content/vocab';
import { referenceContext, resolveFacts, screen } from './engine';
import { RULES } from './rules';
import type { FactMeta, FactSource, ScreenContext, ScreenOptions, ScreenResult, TaskFacts } from './types';

export type MachineClassFamilies = Record<string, readonly FamilyId[]>;

export function machineClassFamilies(classes: MachineClassRecord[]): MachineClassFamilies {
  return Object.fromEntries(classes.map((c) => [c.id, c.families]));
}

/** A task record's attributes as engine input, with confidence and note carried per fact. */
export function factsFromRecord(r: TaskRecord): FactSource {
  const a = r.attributes;
  const facts: Partial<TaskFacts> = {
    object_mass_kg: a.object_mass_kg.value,
    variability: a.variability.value,
    error_tolerance: a.error_tolerance.value,
    safety_criticality: a.safety_criticality.value,
    reach_height_m: a.reach_height_m.value,
    environment: a.environment.value,
    dust: a.dust.value,
    wet: a.wet.value,
    floor: a.floor.value,
    incumbent_automation: a.incumbent_automation.value ? { status: a.incumbent_automation.value.status, machine_classes: a.incumbent_automation.value.machine_classes } : null,
    data_sensitivity: a.data_sensitivity.value,
    runtime_continuous_min: a.runtime_continuous_min.value,
  };
  const meta: FactMeta = {};
  for (const k of Object.keys(facts) as (keyof TaskFacts)[]) {
    const entry = a[k];
    meta[k] = { confidence: entry.confidence, note: entry.note, ...(entry.evidence_url ? { evidence_url: entry.evidence_url } : {}) };
  }
  return { setting: r.setting, facts, meta };
}

/** Screen a library record. Without a context it is the reference run the record's pin is checked against. */
export function screenRecord(
  r: TaskRecord,
  classes: MachineClassFamilies,
  ctx: ScreenContext = referenceContext(r.setting),
  overrides: Partial<TaskFacts> = {},
  forClass: SolutionClassId = 'humanoid',
): ScreenResult {
  const opts: ScreenOptions = { family: r.family, forClass, solutionClasses: r.solution_classes, machineClassFamilies: classes };
  return screen(resolveFacts(factsFromRecord(r), overrides, ctx, opts), ctx, opts);
}

/**
 * Where the authored pin disagrees with a fresh computation. Empty means the pin
 * is current. The authored better answer may be any class the engine suggests,
 * not necessarily its first pick: that choice is the author's.
 */
export function pinDifferences(r: TaskRecord, result: ScreenResult): string[] {
  const out: string[] = [];
  if (r.screen.verdict !== result.verdict) out.push(`verdict pinned ${r.screen.verdict}, computed ${result.verdict}`);
  for (const rule of RULES) {
    const pinned = r.screen.results[rule.id];
    const got = result.results[rule.id].status;
    if (pinned !== got) out.push(`${rule.id} pinned ${pinned}, computed ${got}`);
  }
  const pinnedKilled = r.screen.killed_by.join(',');
  const gotKilled = result.killed_by.join(',');
  if (pinnedKilled !== gotKilled) out.push(`killed_by pinned [${pinnedKilled}], computed [${gotKilled}]`);
  const better = r.screen.better_answer.class;
  if (result.verdict === 'ruled_out' && better && !result.suggested_solution_classes.includes(better)) {
    out.push(`better_answer ${better} is not among the engine's suggestions [${result.suggested_solution_classes.join(', ')}]`);
  }
  return out;
}
