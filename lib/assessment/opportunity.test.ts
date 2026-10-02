import { describe, expect, it } from 'vitest';
import { FACT_KEYS, type ResolvedFacts, type TaskFacts } from '@/lib/screen/types';
import { reviewOpportunity, REQUIREMENT_LABELS } from './opportunity';

const INPUT: TaskFacts = {
  object_mass_kg: { min: 1, max: 12 }, variability: 'high', error_tolerance: 'tolerant', safety_criticality: 'none',
  reach_height_m: { min: 0.5, max: 1.5 }, environment: 'indoor', dust: { type: 'none', zone: 'none' },
  wet: 'dry', floor: 'level', incumbent_automation: { status: 'none', machine_classes: [] }, data_sensitivity: 'none', runtime_continuous_min: 60,
};
function facts(overrides: Partial<TaskFacts> = {}): ResolvedFacts {
  return Object.fromEntries(Object.entries({ ...INPUT, ...overrides }).map(([key, value]) => [key, { value, origin: value === null ? 'none' : 'visitor' }])) as ResolvedFacts;
}

describe('general opportunity review', () => {
  it('keeps heavy handling discoverable without imposing a humanoid payload ceiling', () => {
    const result = reviewOpportunity(facts({ object_mass_kg: { min: 1500, max: 2000 } }), 'heavy_element_handling', ['humanoid']);
    expect(result).toMatchObject({ modelVersion: 'opportunity-v1', status: 'ready_to_compare', missingFacts: [] });
    expect(result.solutionClasses.map((s) => s.id)).toEqual(expect.arrayContaining(['gantry', 'vacuum_lifter_assist', 'dedicated_machine', 'humanoid']));
    expect(result.requirements.find((r) => r.key === 'object_mass_kg')).toMatchObject({ status: 'known', value: '1,500–2,000 kg' });
    expect(result.scopeNote).toContain('does not show that any robot');
    expect(result).not.toHaveProperty('verdict');
  });

  it('adds transport and fixed-cell comparisons without treating variability as a task failure', () => {
    const result = reviewOpportunity(facts({ variability: 'low' }), 'intralogistics_transport');
    expect(result.status).toBe('ready_to_compare');
    expect(result.solutionClasses.map((s) => s.id)).toEqual(expect.arrayContaining(['amr_carts', 'fixed_cobot_cell']));
    expect(result.solutionClasses.find((s) => s.id === 'amr_carts')!.reason).toContain('transport task');
  });

  it('uses existing machinery as a baseline without removing alternative solution classes', () => {
    const result = reviewOpportunity(facts({ incumbent_automation: { status: 'full', machine_classes: ['existing_cell'] } }), 'machine_tending', ['humanoid', 'fixed_cobot_cell', 'humanoid']);
    const ids = result.solutionClasses.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['keep_process', 'dedicated_machine', 'humanoid', 'fixed_cobot_cell']));
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.solutionClasses.find((s) => s.id === 'keep_process')!.reason).toContain('Existing equipment');
    expect(result.status).toBe('ready_to_compare');
  });

  it('turns adverse conditions and long duty cycles into configuration evidence questions', () => {
    const result = reviewOpportunity(facts({
      dust: { type: 'wood', zone: 'atex' }, environment: 'outdoor', wet: 'rain', floor: 'stairs',
      runtime_continuous_min: 720, reach_height_m: { min: 2, max: 5 }, safety_criticality: 'life_safety', error_tolerance: 'critical',
    }), 'inspection_qa_documentation');
    expect(result.status).toBe('ready_to_compare');
    expect(result.solutionClasses.map((s) => s.id)).toContain('quadruped_inspection');
    expect(result.evidenceQuestions.join(' ')).toMatch(/hazardous-area.*qualified specialist/);
    expect(result.evidenceQuestions.join(' ')).toContain('measured runtime under representative load');
    expect(result.evidenceQuestions.join(' ')).toContain('risk review');
    expect(result.flags).toEqual(expect.arrayContaining(['atex_betrsichv', 'wood_dust_trgs_553']));
  });

  it('retains unknowns and their form keys while still allowing comparison', () => {
    const result = reviewOpportunity(facts({ object_mass_kg: null, dust: null, runtime_continuous_min: null }), 'intralogistics_transport');
    expect(result.status).toBe('needs_information');
    expect(result.missingFacts).toEqual(['object_mass_kg', 'dust', 'runtime_continuous_min']);
    expect(result.requirements.map((r) => r.key)).toEqual(FACT_KEYS);
    expect(result.requirements.find((r) => r.key === 'dust')).toMatchObject({ status: 'missing', value: 'Not provided', label: REQUIREMENT_LABELS.dust });
    expect(result.solutionClasses.map((s) => s.id)).toContain('amr_carts');
  });

  it('preserves zero values and provenance without presenting sourced requirements as robot proof', () => {
    const input = facts({ object_mass_kg: { min: 0, max: 0 }, runtime_continuous_min: 0 });
    input.object_mass_kg = { value: { min: 0, max: 0 }, origin: 'record', confidence: 'confirmed', evidence_url: 'https://example.com/task', note: 'Inspection uses no handled object.' };
    const result = reviewOpportunity(input, 'inspection_qa_documentation');
    expect(result.missingFacts).toEqual([]);
    expect(result.requirements.find((r) => r.key === 'object_mass_kg')).toMatchObject({ value: '0 kg', origin: 'record', evidenceUrl: 'https://example.com/task', confidence: 'confirmed' });
    expect(result.solutionClasses.every((s) => s.reason.length > 0 && s.evidenceQuestions.length > 0)).toBe(true);
  });
});
