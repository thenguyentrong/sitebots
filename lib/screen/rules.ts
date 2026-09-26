import type { FamilyId, RuleId, SolutionClassId } from '@/lib/content/vocab';
import { SCREEN_THRESHOLDS } from './thresholds';
import type { Evaluation, Rule } from './types';

/**
 * The screen. Five hard tests decide whether a task is a humanoid or
 * mobile-manipulator candidate at all; five advisory tests attach warnings and
 * compliance flags. Every rule is a plain object so the methodology page can
 * render it and a unit test can drive it through pass, marginal, fail and unknown.
 *
 * Unknown never passes: a hard rule that cannot be evaluated leaves the task
 * unscreened, and an advisory one leaves a question on the card.
 */

const T = SCREEN_THRESHOLDS;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Compliance entry ids the rules attach as flags; the content check requires them in data/compliance. */
export const RULE_FLAG_IDS = ['wood_dust_trgs_553', 'mineral_dust_trgs_559', 'atex_betrsichv', 'gdpr_art_88_bdsg_26', 'betrvg_87_1_6', 'data_residency_air_gapped'] as const;

/** Which rule's better answer leads when several hard rules fail. */
export const BETTER_ANSWER_PRIORITY: RuleId[] = ['T3_incumbent', 'T1_mass', 'X5_atex', 'T2_dust', 'T5_failure_tolerance', 'T4_variability', 'X2_outdoor'];

function massBetterAnswer(family: FamilyId): SolutionClassId[] {
  if (family === 'intralogistics_transport') return ['amr_carts', 'dedicated_machine'];
  if (family === 'heavy_element_handling') return ['gantry', 'vacuum_lifter_assist', 'keep_process'];
  return ['vacuum_lifter_assist', 'gantry', 'dedicated_machine'];
}

/**
 * Weather rules the humanoid out. Inspection and patrol rounds go to a quadruped
 * with a published ingress rating; trade work outdoors stays with people unless a
 * dedicated machine exists for the step.
 */
function outdoorBetterAnswer(family: FamilyId): SolutionClassId[] {
  if (family === 'inspection_qa_documentation' || family === 'monitoring_safety_patrol') return ['quadruped_inspection', 'dedicated_machine'];
  return ['keep_process', 'dedicated_machine'];
}

const T1_mass: Rule = {
  id: 'T1_mass',
  kind: 'hard',
  order: 1,
  inputs: ['object_mass_kg'],
  thresholds: ['mass_design_kg', 'mass_ceiling_kg'],
  evaluate: (f, _ctx, opts): Evaluation => {
    const m = f.object_mass_kg.value;
    if (!m) return { status: 'unknown', message: 'screen.t1.unknown' };
    const design = T.mass_design_kg.value;
    const ceiling = T.mass_ceiling_kg.value.max;
    if (m.max < design) return { status: 'pass', message: 'screen.t1.pass', params: { max_kg: m.max, design_kg: design } };
    if (m.max <= ceiling) return { status: 'marginal', message: 'screen.t1.marginal', params: { max_kg: m.max, design_kg: design, ceiling_kg: ceiling } };
    return {
      status: 'fail',
      message: 'screen.t1.fail',
      params: { max_kg: m.max, ceiling_kg: ceiling, factor: round1(m.max / ceiling) },
      betterAnswer: massBetterAnswer(opts.family),
    };
  },
};

const T2_dust: Rule = {
  id: 'T2_dust',
  kind: 'hard',
  order: 2,
  inputs: ['dust'],
  thresholds: [],
  evaluate: (f): Evaluation => {
    const d = f.dust.value;
    if (!d) return { status: 'unknown', message: 'screen.t2.unknown' };
    if (d.zone === 'atex') return { status: 'fail', message: 'screen.t2.fail_atex', betterAnswer: ['dedicated_machine'], flags: ['atex_betrsichv'] };
    if (d.zone === 'zone') return { status: 'fail', message: 'screen.t2.fail_zone', betterAnswer: ['process_change', 'dedicated_machine'] };
    if (d.zone === 'none' || d.type === 'none') return { status: 'pass', message: 'screen.t2.pass_none' };
    // Controlled workroom: passes, but the airborne exposure has to be measured with the robot running.
    const flags = d.type === 'wood' ? ['wood_dust_trgs_553'] : ['mineral_dust_trgs_559'];
    return { status: 'pass', message: 'screen.t2.pass', flags };
  },
};

const T3_incumbent: Rule = {
  id: 'T3_incumbent',
  kind: 'hard',
  order: 3,
  inputs: ['incumbent_automation'],
  thresholds: [],
  evaluate: (f, ctx): Evaluation => {
    const inc = f.incumbent_automation.value;
    if (!inc) return { status: 'unknown', message: 'screen.t3.unknown' };
    if (inc.status === 'none') return { status: 'pass', message: 'screen.t3.pass' };
    if (inc.status === 'partial') return { status: 'marginal', message: 'screen.t3.marginal' };
    // A visitor's answer is about their own site: a machine they name is one they run.
    const owned = f.incumbent_automation.origin === 'context' || f.incumbent_automation.origin === 'visitor' || (Array.isArray(ctx.existingAutomation) && inc.machine_classes.some((c) => (ctx.existingAutomation as string[]).includes(c)));
    if (owned) return { status: 'fail', message: 'screen.t3.fail_owned', betterAnswer: ['keep_process'] };
    return { status: 'fail', message: 'screen.t3.fail_market', params: { machines: inc.machine_classes.join(', ') || '–' }, betterAnswer: ['dedicated_machine'] };
  },
};

const T4_variability: Rule = {
  id: 'T4_variability',
  kind: 'hard',
  order: 4,
  inputs: ['variability'],
  thresholds: [],
  evaluate: (f): Evaluation => {
    const v = f.variability.value;
    if (!v) return { status: 'unknown', message: 'screen.t4.unknown' };
    if (v === 'high') return { status: 'pass', message: 'screen.t4.pass' };
    if (v === 'medium') return { status: 'marginal', message: 'screen.t4.marginal' };
    return { status: 'fail', message: 'screen.t4.fail', betterAnswer: ['fixed_cobot_cell'] };
  },
};

const T5_failure_tolerance: Rule = {
  id: 'T5_failure_tolerance',
  kind: 'hard',
  order: 5,
  inputs: ['error_tolerance', 'safety_criticality'],
  thresholds: ['reliability_pct'],
  evaluate: (f): Evaluation => {
    const tol = f.error_tolerance.value;
    const saf = f.safety_criticality.value;
    // A known critical value fails even while the other input is still open.
    if (tol === 'critical' || (saf && saf !== 'none')) return { status: 'fail', message: 'screen.t5.fail', betterAnswer: ['keep_process', 'dedicated_machine'] };
    if (!tol || !saf) return { status: 'unknown', message: 'screen.t5.unknown' };
    if (tol === 'limited') return { status: 'marginal', message: 'screen.t5.marginal' };
    return { status: 'pass', message: 'screen.t5.pass', params: { reliability_pct: T.reliability_pct.value } };
  },
};

const X1_reach: Rule = {
  id: 'X1_reach',
  kind: 'advisory',
  order: 6,
  inputs: ['reach_height_m'],
  thresholds: ['reach_marginal_m'],
  evaluate: (f): Evaluation => {
    const r = f.reach_height_m.value;
    if (!r) return { status: 'unknown', message: 'screen.x1.unknown' };
    const limit = T.reach_marginal_m.value;
    if (r.max <= limit) return { status: 'pass', message: 'screen.x1.pass', params: { max_m: r.max } };
    return { status: 'marginal', message: 'screen.x1.marginal', params: { max_m: r.max, limit_m: limit } };
  },
};

const X2_outdoor: Rule = {
  id: 'X2_outdoor',
  // No humanoid publishes a usable ingress rating, so for that class weather is a hard limit.
  kind: (opts) => (opts.forClass === 'humanoid' ? 'hard' : 'advisory'),
  order: 7,
  inputs: ['environment', 'wet'],
  thresholds: [],
  evaluate: (f, _ctx, opts): Evaluation => {
    const env = f.environment.value;
    const wet = f.wet.value;
    if (!env) return { status: 'unknown', message: 'screen.x2.unknown' };
    if (env === 'outdoor' || wet === 'rain') return { status: 'fail', message: 'screen.x2.outdoor', betterAnswer: outdoorBetterAnswer(opts.family) };
    if (env === 'both' || wet === 'damp') return { status: 'marginal', message: 'screen.x2.both' };
    return { status: 'pass', message: 'screen.x2.indoor' };
  },
};

const X3_data: Rule = {
  id: 'X3_data',
  kind: 'advisory',
  order: 8,
  inputs: ['data_sensitivity'],
  thresholds: [],
  evaluate: (f, ctx): Evaluation => {
    const d = f.data_sensitivity.value;
    if (!d) return { status: 'unknown', message: 'screen.x3.unknown' };
    if (d === 'personal_data') {
      const flags = ['gdpr_art_88_bdsg_26'];
      if (ctx.worksCouncil !== 'no') flags.push('betrvg_87_1_6');
      return { status: 'flag', message: 'screen.x3.personal', flags };
    }
    if (d === 'confidential') return { status: 'flag', message: 'screen.x3.confidential', flags: ['data_residency_air_gapped'] };
    return { status: 'pass', message: 'screen.x3.none' };
  },
};

const X4_runtime: Rule = {
  id: 'X4_runtime',
  kind: 'advisory',
  order: 9,
  inputs: ['runtime_continuous_min'],
  thresholds: ['runtime_continuous_min'],
  evaluate: (f): Evaluation => {
    const rt = f.runtime_continuous_min.value;
    const { min, max } = T.runtime_continuous_min.value;
    if (rt === null) return { status: 'unknown', message: 'screen.x4.unknown', params: { min_min: min, limit_min: max } };
    if (rt <= max) return { status: 'pass', message: 'screen.x4.pass', params: { minutes: rt } };
    return { status: 'marginal', message: 'screen.x4.marginal', params: { minutes: rt, limit_min: max } };
  },
};

const X5_atex: Rule = {
  id: 'X5_atex',
  kind: 'hard',
  order: 10,
  inputs: ['dust'],
  thresholds: [],
  evaluate: (f): Evaluation => {
    const d = f.dust.value;
    if (!d) return { status: 'unknown', message: 'screen.t2.unknown' };
    if (d.zone === 'atex') return { status: 'fail', message: 'screen.x5.fail', betterAnswer: ['dedicated_machine'], flags: ['atex_betrsichv'] };
    return { status: 'pass', message: 'screen.x5.pass' };
  },
};

export const RULES: Rule[] = [T1_mass, T2_dust, T3_incumbent, T4_variability, T5_failure_tolerance, X1_reach, X2_outdoor, X3_data, X4_runtime, X5_atex];
