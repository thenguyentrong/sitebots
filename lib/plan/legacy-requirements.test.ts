import { describe, expect, it } from 'vitest';
import { emptyFacts } from '@/lib/screen/facts';
import { legacyFactsFromNeeds, legacyRequirementIssues, retainedLegacyTerrain } from './legacy-requirements';
import { newProject, ProjectSchema, requirementsFor } from './model';
import { factsFromNeeds } from './migrate';
import { reviewForSite } from './screen';

const id = '00000000-0000-4000-8000-000000000001';
function oldProject() {
  const { overrideSemanticsVersion: _marker, ...project } = newProject(id, 'transport');
  project.needs = { payload: '12', reach: '2', runtime: '4', terrain: 'mud', stairs: '', environment: 'outdoor', autonomy: 'supervised' };
  return project;
}

describe('authoritative task requirements and older saved inputs', () => {
  it('transfers old custom inputs once into editable task facts including runtime', () => {
    const old = oldProject();
    old.factOverrides.object_mass_kg = { min: 0, max: 5 };
    const migrated = ProjectSchema.parse(old);
    expect(migrated.task.kind === 'custom' && migrated.task.facts).toMatchObject({ object_mass_kg: { min: 0, max: 12 }, reach_height_m: { min: 0, max: 2 }, runtime_continuous_min: 240, environment: 'outdoor', floor: 'uneven' });
    expect(migrated.factOverrides).toEqual({});
    const result = requirementsFor(migrated);
    expect(result.success && result.data).toMatchObject({ payload_kg: 12, reach_height_m: 2, runtime_h_per_shift: 4, environment: 'outdoor', terrain: 'mud', autonomy: 'supervised' });
    if (migrated.task.kind === 'custom') migrated.task.facts.object_mass_kg = { min: 0, max: 100 };
    const changed = requirementsFor(ProjectSchema.parse(migrated));
    expect(changed.success && changed.data.payload_kg).toBe(100);
    expect(reviewForSite(migrated).requirements.find((r) => r.key === 'object_mass_kg')?.value).toBe('0–100 kg');
  });

  it('lets current known values and explicit unknowns win over all stale legacy requirements', () => {
    const current = ProjectSchema.parse(oldProject());
    current.factOverrides = { object_mass_kg: { min: 0, max: 30 }, reach_height_m: { min: 0, max: 1 }, runtime_continuous_min: 120, floor: 'level', environment: 'indoor' };
    let parsed = requirementsFor(current);
    expect(parsed.success && parsed.data).toMatchObject({ payload_kg: 30, reach_height_m: 1, runtime_h_per_shift: 2, terrain: 'paved', environment: 'indoor' });
    current.needs.stairs = 'required';
    current.factOverrides = { object_mass_kg: null, reach_height_m: null, runtime_continuous_min: null, floor: null, environment: null };
    parsed = requirementsFor(current);
    expect(parsed.success && parsed.data).toMatchObject({ payload_kg: undefined, reach_height_m: undefined, runtime_h_per_shift: undefined, terrain: undefined, stairs: undefined, environment: undefined });
  });

  it('preserves runtime from the version-one finder', () => {
    expect(factsFromNeeds(oldProject()).runtime_continuous_min).toBe(240);
  });

  it('retains specific old ground detail only while compatible with the current floor', () => {
    expect(retainedLegacyTerrain('mud', 'uneven')).toBe('mud');
    expect(retainedLegacyTerrain('rubble', 'mixed')).toBe('rubble');
    for (const floor of [null, 'level', 'stairs'] as const) expect(retainedLegacyTerrain('mud', floor)).toBeUndefined();
  });

  it('keeps invalid old numeric inputs visibly unknown without falling back to a plausible value', () => {
    const old = oldProject();
    old.needs.payload = '-3';
    old.needs.runtime = 'not known';
    const imported = legacyFactsFromNeeds(old.needs);
    expect(imported.object_mass_kg).toBeNull();
    expect(imported.runtime_continuous_min).toBeNull();
    expect(legacyRequirementIssues(old.needs, emptyFacts())).toHaveLength(2);
    expect(legacyRequirementIssues(old.needs, { ...emptyFacts(), object_mass_kg: { min: 0, max: 3 }, runtime_continuous_min: 60 })).toEqual([]);
    const migrated = ProjectSchema.parse(old);
    expect(migrated.needs.payload).toBe('-3');
    expect(reviewForSite(migrated).missingFacts).toEqual(expect.arrayContaining(['object_mass_kg', 'runtime_continuous_min']));
  });
});
