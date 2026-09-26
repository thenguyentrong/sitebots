import type { RuleId, SolutionClassId, Verdict } from '@/lib/content/vocab';
import type { MessageKey } from './messages';
import { BETTER_ANSWER_PRIORITY, RULES } from './rules';
import { THRESHOLDS_VERSION } from './thresholds';
import {
  FACT_KEYS,
  type FactKey,
  type FactSource,
  type ResolvedFact,
  type ResolvedFacts,
  type RuleResult,
  type ScreenContext,
  type ScreenOptions,
  type ScreenResult,
  type TaskFacts,
} from './types';

/** No answers at all: every fact stays unknown unless a record or the visitor supplies it. */
export function emptyContext(): ScreenContext {
  return { subSetting: null, dust: 'not_sure', existingAutomation: 'not_sure', floor: 'not_sure', exposure: 'not_sure', wet: 'not_sure', worksCouncil: 'not_sure', shiftPattern: 'not_sure' };
}

/** The context a library record is pinned against: its own setting, nothing else answered. */
export function referenceContext(setting: string): ScreenContext {
  return { ...emptyContext(), subSetting: setting };
}

/** Facts that belong to the task itself and travel with the record everywhere. */
const OBJECT_KEYS: FactKey[] = ['object_mass_kg', 'variability', 'error_tolerance', 'safety_criticality', 'reach_height_m', 'data_sensitivity', 'runtime_continuous_min'];
/** Facts that describe the place: the visitor's context answers first, the record only in its own setting. */
const ENVIRONMENT_KEYS: FactKey[] = ['dust', 'wet', 'environment', 'floor'];

const UNKNOWN: ResolvedFact = { value: null, origin: 'none' };

/**
 * Precedence: a visitor override beats everything; object facts then come from the
 * record; environment and process facts come from the context, and from the record
 * only when the record was written for the visitor's own sub-setting. That guard is
 * what keeps a timber-plant record honest for a precast or site visitor.
 */
export function resolveFacts(source: FactSource, overrides: Partial<TaskFacts>, ctx: ScreenContext, opts: Pick<ScreenOptions, 'family' | 'machineClassFamilies'>): ResolvedFacts {
  const sameSetting = source.setting !== null && ctx.subSetting === source.setting;

  const fromOverride = (k: FactKey): ResolvedFact | null => {
    const v = overrides[k];
    return v === undefined || v === null ? null : { value: v, origin: 'visitor' };
  };
  const fromRecord = (k: FactKey): ResolvedFact | null => {
    const v = source.facts[k];
    return v === undefined || v === null ? null : { value: v, origin: 'record', ...(source.meta?.[k] ?? {}) };
  };
  const fromContext = (k: FactKey): ResolvedFact | null => {
    switch (k) {
      case 'dust':
        return ctx.dust === 'not_sure' ? null : { value: ctx.dust, origin: 'context' };
      case 'wet':
        return ctx.wet === 'not_sure' ? null : { value: ctx.wet, origin: 'context' };
      case 'environment':
        return ctx.exposure === 'not_sure' ? null : { value: ctx.exposure, origin: 'context' };
      case 'floor':
        return ctx.floor === 'not_sure' ? null : { value: ctx.floor, origin: 'context' };
      case 'incumbent_automation': {
        if (!Array.isArray(ctx.existingAutomation)) return null;
        const covering = ctx.existingAutomation.filter((c) => (opts.machineClassFamilies[c] ?? []).includes(opts.family));
        return covering.length ? { value: { status: 'full', machine_classes: covering }, origin: 'context' } : null;
      }
      default:
        return null;
    }
  };

  const out = {} as Record<FactKey, ResolvedFact>;
  for (const k of FACT_KEYS) {
    let r = fromOverride(k);
    if (!r) {
      if (OBJECT_KEYS.includes(k)) r = fromRecord(k);
      else if (ENVIRONMENT_KEYS.includes(k) || k === 'incumbent_automation') r = fromContext(k) ?? (sameSetting ? fromRecord(k) : null);
    }
    out[k] = r ?? UNKNOWN;
  }
  return out as ResolvedFacts;
}

const unique = <T>(xs: T[]) => [...new Set(xs)];

export function screen(facts: ResolvedFacts, ctx: ScreenContext, opts: ScreenOptions): ScreenResult {
  const results = {} as Record<RuleId, RuleResult>;
  for (const rule of RULES) {
    const kind = typeof rule.kind === 'function' ? rule.kind(opts) : rule.kind;
    results[rule.id] = { ...rule.evaluate(facts, ctx, opts), kind, inputs: rule.inputs };
  }
  const ids = RULES.map((r) => r.id);
  const hardFails = ids.filter((id) => results[id].kind === 'hard' && results[id].status === 'fail');
  const hardUnknown = ids.filter((id) => results[id].kind === 'hard' && results[id].status === 'unknown');
  const anyMarginal = ids.some((id) => results[id].status === 'marginal' || (results[id].kind === 'advisory' && results[id].status === 'fail'));

  let verdict: Verdict;
  let killed_by: RuleId[] = [];
  let open_inputs: FactKey[] = [];
  if (hardFails.length) {
    verdict = 'ruled_out';
    // Priority order first so killed_by[0] is the rule whose better answer leads.
    killed_by = [...BETTER_ANSWER_PRIORITY.filter((id) => hardFails.includes(id)), ...hardFails.filter((id) => !BETTER_ANSWER_PRIORITY.includes(id))];
  } else if (hardUnknown.length) {
    verdict = 'unscreened';
    open_inputs = unique(hardUnknown.flatMap((id) => results[id].inputs));
  } else {
    verdict = anyMarginal ? 'marginal' : 'candidate';
  }

  const flags = unique(ids.flatMap((id) => results[id].flags ?? []));
  const better: SolutionClassId | null = killed_by.length ? (results[killed_by[0]].betterAnswer?.[0] ?? null) : null;
  const better_answer = { class: better, message: (better ? `screen.better.${better}` : 'screen.better.none') as MessageKey };
  const suggested_solution_classes = verdict === 'ruled_out' ? unique(killed_by.flatMap((id) => results[id].betterAnswer ?? [])) : opts.solutionClasses;

  return { verdict, results, killed_by, open_inputs, flags, better_answer, suggested_solution_classes, facts, thresholds_version: THRESHOLDS_VERSION };
}
