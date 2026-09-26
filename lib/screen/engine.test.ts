import { describe, expect, it } from 'vitest';
import type { RuleId, RuleStatus } from '@/lib/content/vocab';
import { emptyContext, referenceContext, resolveFacts, screen } from './engine';
import { RULES } from './rules';
import type { FactSource, ResolvedFacts, ScreenContext, ScreenOptions, TaskFacts } from './types';

/** A task that passes everything: light, variable, tolerant, indoor, controlled wood dust, nobody automates it yet. */
const GOOD: TaskFacts = {
  object_mass_kg: { min: 0.1, max: 2 },
  variability: 'high',
  error_tolerance: 'tolerant',
  safety_criticality: 'none',
  reach_height_m: { min: 0.4, max: 1.6 },
  environment: 'indoor',
  dust: { type: 'wood', zone: 'controlled' },
  wet: 'dry',
  floor: 'level',
  incumbent_automation: { status: 'none', machine_classes: [] },
  data_sensitivity: 'none',
  runtime_continuous_min: 45,
};

const OPTS: ScreenOptions = {
  family: 'kitting_picking_sorting',
  forClass: 'humanoid',
  solutionClasses: ['mobile_manipulator_wheeled', 'humanoid', 'fixed_cobot_cell'],
  machineClassFamilies: { nailing_sheathing_bridge: ['assembly_fastening'], pick_to_light: ['kitting_picking_sorting'] },
};

function facts(overrides: Partial<TaskFacts> = {}, origin: 'record' | 'visitor' | 'context' = 'record'): ResolvedFacts {
  const merged = { ...GOOD, ...overrides };
  return Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, { value: v, origin: v === null ? 'none' : origin }])) as ResolvedFacts;
}

const run = (overrides: Partial<TaskFacts> = {}, ctx: ScreenContext = emptyContext(), opts: ScreenOptions = OPTS) => screen(facts(overrides), ctx, opts);

describe('rules', () => {
  const cases: [RuleId, Partial<TaskFacts>, RuleStatus][] = [
    ['T1_mass', { object_mass_kg: { min: 0, max: 14.9 } }, 'pass'],
    ['T1_mass', { object_mass_kg: { min: 0, max: 15 } }, 'marginal'],
    ['T1_mass', { object_mass_kg: { min: 0, max: 25 } }, 'marginal'],
    ['T1_mass', { object_mass_kg: { min: 0, max: 25.1 } }, 'fail'],
    ['T1_mass', { object_mass_kg: null }, 'unknown'],
    ['T2_dust', { dust: { type: 'none', zone: 'none' } }, 'pass'],
    ['T2_dust', { dust: { type: 'mineral', zone: 'controlled' } }, 'pass'],
    ['T2_dust', { dust: { type: 'wood', zone: 'zone' } }, 'fail'],
    ['T2_dust', { dust: { type: 'wood', zone: 'atex' } }, 'fail'],
    ['T2_dust', { dust: null }, 'unknown'],
    ['T3_incumbent', { incumbent_automation: { status: 'none', machine_classes: [] } }, 'pass'],
    ['T3_incumbent', { incumbent_automation: { status: 'partial', machine_classes: ['pick_to_light'] } }, 'marginal'],
    ['T3_incumbent', { incumbent_automation: { status: 'full', machine_classes: ['pick_to_light'] } }, 'fail'],
    ['T3_incumbent', { incumbent_automation: null }, 'unknown'],
    ['T4_variability', { variability: 'high' }, 'pass'],
    ['T4_variability', { variability: 'medium' }, 'marginal'],
    ['T4_variability', { variability: 'low' }, 'fail'],
    ['T4_variability', { variability: null }, 'unknown'],
    ['T5_failure_tolerance', { error_tolerance: 'tolerant', safety_criticality: 'none' }, 'pass'],
    ['T5_failure_tolerance', { error_tolerance: 'limited' }, 'marginal'],
    ['T5_failure_tolerance', { error_tolerance: 'critical' }, 'fail'],
    ['T5_failure_tolerance', { safety_criticality: 'structural' }, 'fail'],
    ['T5_failure_tolerance', { error_tolerance: null }, 'unknown'],
    ['T5_failure_tolerance', { error_tolerance: null, safety_criticality: 'life_safety' }, 'fail'],
    ['X1_reach', { reach_height_m: { min: 0, max: 1.8 } }, 'pass'],
    ['X1_reach', { reach_height_m: { min: 0, max: 2.4 } }, 'marginal'],
    ['X1_reach', { reach_height_m: null }, 'unknown'],
    ['X2_outdoor', { environment: 'indoor' }, 'pass'],
    ['X2_outdoor', { environment: 'both' }, 'marginal'],
    ['X2_outdoor', { environment: 'indoor', wet: 'damp' }, 'marginal'],
    ['X2_outdoor', { environment: 'outdoor' }, 'fail'],
    ['X2_outdoor', { environment: 'indoor', wet: 'rain' }, 'fail'],
    ['X2_outdoor', { environment: null }, 'unknown'],
    ['X3_data', { data_sensitivity: 'none' }, 'pass'],
    ['X3_data', { data_sensitivity: 'personal_data' }, 'flag'],
    ['X3_data', { data_sensitivity: 'confidential' }, 'flag'],
    ['X3_data', { data_sensitivity: null }, 'unknown'],
    ['X4_runtime', { runtime_continuous_min: 90 }, 'pass'],
    ['X4_runtime', { runtime_continuous_min: 91 }, 'marginal'],
    ['X4_runtime', { runtime_continuous_min: null }, 'unknown'],
    ['X5_atex', { dust: { type: 'wood', zone: 'controlled' } }, 'pass'],
    ['X5_atex', { dust: { type: 'wood', zone: 'atex' } }, 'fail'],
    ['X5_atex', { dust: null }, 'unknown'],
  ];
  it.each(cases)('%s with %j → %s', (rule, overrides, expected) => {
    expect(run(overrides).results[rule].status).toBe(expected);
  });

  it('every rule declares its inputs and evaluates to a known status', () => {
    const result = run();
    for (const rule of RULES) {
      expect(rule.inputs.length).toBeGreaterThan(0);
      expect(['pass', 'marginal', 'fail', 'unknown', 'flag']).toContain(result.results[rule.id].status);
    }
  });
});

describe('verdicts', () => {
  it('all pass → candidate with the record suggestions', () => {
    const r = run();
    expect(r.verdict).toBe('candidate');
    expect(r.killed_by).toEqual([]);
    expect(r.better_answer.class).toBeNull();
    expect(r.suggested_solution_classes).toEqual(OPTS.solutionClasses);
    expect(r.flags).toEqual(['wood_dust_trgs_553']);
  });

  it('a hard unknown never passes: the task stays unscreened and names the open input', () => {
    const r = run({ dust: null });
    expect(r.verdict).toBe('unscreened');
    expect(r.open_inputs).toEqual(['dust']);
  });

  it('an advisory unknown does not block', () => {
    expect(run({ reach_height_m: null, runtime_continuous_min: null, data_sensitivity: null }).verdict).toBe('candidate');
  });

  it('marginal when any test is marginal', () => {
    expect(run({ variability: 'medium' }).verdict).toBe('marginal');
    expect(run({ reach_height_m: { min: 0, max: 2.5 } }).verdict).toBe('marginal');
  });

  it('a heavy object rules the task out and names a lifting aid', () => {
    const r = run({ object_mass_kg: { min: 40, max: 60 } });
    expect(r.verdict).toBe('ruled_out');
    expect(r.killed_by).toEqual(['T1_mass']);
    expect(r.better_answer.class).toBe('vacuum_lifter_assist');
    expect(r.results.T1_mass.params?.factor).toBe(2.4);
  });

  it('fail dominates unknown', () => {
    const r = run({ object_mass_kg: { min: 40, max: 60 }, dust: null });
    expect(r.verdict).toBe('ruled_out');
  });

  it('the incumbent machine leads the better answer when several tests fail', () => {
    const r = run({ object_mass_kg: { min: 0, max: 50 }, incumbent_automation: { status: 'full', machine_classes: ['pick_to_light'] } });
    expect(r.killed_by[0]).toBe('T3_incumbent');
    expect(r.better_answer.class).toBe('dedicated_machine');
    expect(r.results.T3_incumbent.message).toBe('screen.t3.fail_market');
    expect(r.suggested_solution_classes).toContain('vacuum_lifter_assist');
  });

  it('a machine the visitor already runs becomes the baseline', () => {
    const ctx: ScreenContext = { ...emptyContext(), existingAutomation: ['pick_to_light'] };
    const r = run({ incumbent_automation: { status: 'full', machine_classes: ['pick_to_light'] } }, ctx);
    expect(r.results.T3_incumbent.message).toBe('screen.t3.fail_owned');
    expect(r.better_answer.class).toBe('keep_process');
  });

  it('a visitor who says a machine does it on their site keeps the process', () => {
    const r = screen(facts({ incumbent_automation: { status: 'full', machine_classes: [] } }, 'visitor'), emptyContext(), OPTS);
    expect(r.results.T3_incumbent.message).toBe('screen.t3.fail_owned');
    expect(r.better_answer.class).toBe('keep_process');
  });

  it('outdoor work is hard for humanoids and advisory for other classes', () => {
    expect(run({ environment: 'outdoor' }).verdict).toBe('ruled_out');
    const wheeled = run({ environment: 'outdoor' }, emptyContext(), { ...OPTS, forClass: 'mobile_manipulator_wheeled' });
    expect(wheeled.verdict).toBe('marginal');
    expect(wheeled.results.X2_outdoor.kind).toBe('advisory');
  });

  it('outdoor trade work keeps the process; outdoor inspection goes to a quadruped', () => {
    expect(run({ environment: 'outdoor' }).better_answer.class).toBe('keep_process');
    expect(run({ environment: 'outdoor' }, emptyContext(), { ...OPTS, family: 'inspection_qa_documentation' }).better_answer.class).toBe('quadruped_inspection');
  });

  it('personal data flags data protection and, unless ruled out, the works council', () => {
    expect(run({ data_sensitivity: 'personal_data' }).flags).toEqual(['wood_dust_trgs_553', 'gdpr_art_88_bdsg_26', 'betrvg_87_1_6']);
    expect(run({ data_sensitivity: 'personal_data' }, { ...emptyContext(), worksCouncil: 'no' }).flags).toEqual(['wood_dust_trgs_553', 'gdpr_art_88_bdsg_26']);
  });

  it('an ATEX zone fails two hard rules and carries the flag', () => {
    const r = run({ dust: { type: 'mixed', zone: 'atex' } });
    expect(r.verdict).toBe('ruled_out');
    expect(r.killed_by).toEqual(['X5_atex', 'T2_dust']);
    expect(r.flags).toEqual(['atex_betrsichv']);
  });
});

describe('resolveFacts', () => {
  const source: FactSource = { setting: 'prefab_timber', facts: GOOD, meta: { object_mass_kg: { confidence: 'likely', note: 'from the record' } } };
  const deps = { family: OPTS.family, machineClassFamilies: OPTS.machineClassFamilies };

  it('object facts travel with the record into any setting', () => {
    const f = resolveFacts(source, {}, { ...emptyContext(), subSetting: 'precast_concrete' }, deps);
    expect(f.object_mass_kg).toMatchObject({ value: GOOD.object_mass_kg, origin: 'record', confidence: 'likely', note: 'from the record' });
    expect(f.variability.origin).toBe('record');
  });

  it('environment and process facts do not travel to another setting', () => {
    const f = resolveFacts(source, {}, { ...emptyContext(), subSetting: 'precast_concrete' }, deps);
    expect(f.dust).toEqual({ value: null, origin: 'none' });
    expect(f.incumbent_automation).toEqual({ value: null, origin: 'none' });
    expect(screen(f, { ...emptyContext(), subSetting: 'precast_concrete' }, OPTS).verdict).toBe('unscreened');
  });

  it('in its own setting the record answers the environment', () => {
    const f = resolveFacts(source, {}, referenceContext('prefab_timber'), deps);
    expect(f.dust).toMatchObject({ value: GOOD.dust, origin: 'record' });
    expect(screen(f, referenceContext('prefab_timber'), OPTS).verdict).toBe('candidate');
  });

  it('the context answers before the record, the visitor before everything', () => {
    const ctx: ScreenContext = { ...referenceContext('prefab_timber'), dust: { type: 'mineral', zone: 'zone' } };
    expect(resolveFacts(source, {}, ctx, deps).dust).toMatchObject({ value: { type: 'mineral', zone: 'zone' }, origin: 'context' });
    expect(resolveFacts(source, { dust: { type: 'none', zone: 'none' } }, ctx, deps).dust).toMatchObject({ value: { type: 'none', zone: 'none' }, origin: 'visitor' });
  });

  it('a covering machine in the context makes the step fully automated', () => {
    const ctx: ScreenContext = { ...emptyContext(), subSetting: 'precast_concrete', existingAutomation: ['pick_to_light', 'nailing_sheathing_bridge'] };
    expect(resolveFacts(source, {}, ctx, deps).incumbent_automation).toEqual({ value: { status: 'full', machine_classes: ['pick_to_light'] }, origin: 'context' });
    const other = resolveFacts(source, {}, { ...ctx, existingAutomation: ['nailing_sheathing_bridge'] }, deps);
    expect(other.incumbent_automation.value).toBeNull();
  });
});
