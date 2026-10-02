import { describe, expect, it } from 'vitest';
import { loadContent } from '@/lib/content/load';
import { emptyContext } from '@/lib/context/schema';
import { referenceContext, resolveFacts } from '@/lib/screen/engine';
import { emptyFacts, FactOverridesSchema } from '@/lib/screen/facts';
import { factsFromRecord } from '@/lib/screen/record';
import { toTaskCard } from '@/lib/tasks/cards';
import { projectFromCard } from './from-task';
import { readWorkspace } from './migrate';
import { newProject, ProjectSchema, WorkspaceSchema, requirementsFor } from './model';
import { reviewForSite, reviewProject } from './screen';

const id = '00000000-0000-4000-8000-000000000001';
function libraryProject() {
  const record = structuredClone(loadContent().tasks[0].record);
  record.attributes.object_mass_kg = { value: { min: 10, max: 20 }, confidence: 'confirmed', note: 'Task mass evidence.', evidence_url: 'https://example.com/mass' };
  record.attributes.dust = { value: { type: 'wood', zone: 'controlled' }, confidence: 'assumed', note: 'Typical environment.' };
  return { record, project: projectFromCard(id, toTaskCard(record), emptyContext()) };
}

describe('explicit unknown overrides and general review wrappers', () => {
  it('lets an explicit null override both record and context without retaining the source attribution', () => {
    const { record } = libraryProject();
    const context = { ...referenceContext(record.setting), dust: { type: 'mineral' as const, zone: 'zone' as const } };
    const deps = { family: record.family, machineClassFamilies: {} };
    const result = resolveFacts(factsFromRecord(record), { object_mass_kg: null, dust: null }, context, deps);
    expect(result.object_mass_kg).toEqual({ value: null, origin: 'visitor' });
    expect(result.dust).toEqual({ value: null, origin: 'visitor' });
    const inherited = resolveFacts(factsFromRecord(record), { object_mass_kg: undefined, dust: undefined }, context, deps);
    expect(inherited.object_mass_kg).toMatchObject({ value: { min: 10, max: 20 }, origin: 'record', evidence_url: 'https://example.com/mass' });
    expect(inherited.dust).toMatchObject({ value: context.dust, origin: 'context' });
  });

  it('does not manufacture null overrides when parsing an empty or partially answered draft', () => {
    expect(FactOverridesSchema.parse({})).toEqual({});
    expect(FactOverridesSchema.parse({ dust: null })).toEqual({ dust: null });
    const { project } = libraryProject();
    expect(ProjectSchema.parse(project).factOverrides).toEqual({});
    expect(reviewForSite(ProjectSchema.parse(project)).requirements.find((r) => r.key === 'object_mass_kg')).toMatchObject({ status: 'known', value: '10–20 kg' });
  });

  it('migrates old synthetic nulls once while preserving real answers and inherited record values', () => {
    const { project } = libraryProject();
    const { overrideSemanticsVersion: _oldMarker, ...oldProject } = project;
    oldProject.factOverrides = { ...emptyFacts(), variability: 'low' };
    const old = JSON.stringify({ version: 2, activeId: id, projects: [oldProject] });
    const first = readWorkspace(old, null);
    expect(first).toMatchObject({ migrated: true, error: false });
    expect(first.workspace.projects[0].factOverrides).toEqual({ variability: 'low' });
    expect(first.workspace.projects[0].overrideSemanticsVersion).toBe(1);
    expect(reviewForSite(first.workspace.projects[0]).missingFacts).not.toContain('object_mass_kg');
    const second = readWorkspace(JSON.stringify(first.workspace), null);
    expect(second.migrated).toBe(false);
    expect(second.workspace.projects[0].factOverrides).toEqual({ variability: 'low' });
  });

  it('preserves a new explicit unknown across workspace save/reload and reports it as missing', () => {
    const { project } = libraryProject();
    project.factOverrides.object_mass_kg = null;
    const saved = WorkspaceSchema.parse({ version: 2, activeId: id, projects: [project] });
    const loaded = readWorkspace(JSON.stringify(saved), null);
    expect(loaded.migrated).toBe(false);
    expect(loaded.workspace.projects[0].factOverrides).toEqual({ object_mass_kg: null });
    const review = reviewForSite(loaded.workspace.projects[0]);
    expect(review.missingFacts).toContain('object_mass_kg');
    expect(review.requirements.find((r) => r.key === 'object_mass_kg')).toMatchObject({ status: 'missing', origin: 'visitor' });
    expect(review.requirements.find((r) => r.key === 'object_mass_kg')?.evidenceUrl).toBeUndefined();
  });

  it('uses the supplied company context and retains project comparison suggestions', () => {
    const { project } = libraryProject();
    project.solutionClasses = ['amr_carts'];
    const context = { ...emptyContext(), subSetting: 'another_setting', dustType: 'mineral' as const, dustZone: 'zone' as const };
    const review = reviewProject(project, context);
    expect(review.requirements.find((r) => r.key === 'dust')).toMatchObject({ status: 'known', origin: 'context' });
    expect(review.solutionClasses.map((s) => s.id)).toContain('amr_carts');
    expect(review.modelVersion).toBe('opportunity-v1');
  });

  it('reviews a custom task with no family or facts without inventing technical requirements', () => {
    const project = newProject(id);
    project.task = { kind: 'custom', family: '', facts: emptyFacts() };
    const review = reviewForSite(project);
    expect(review.status).toBe('needs_information');
    expect(review.missingFacts).toHaveLength(12);
    expect(review.solutionClasses.map((s) => s.id)).toEqual(['keep_process', 'dedicated_machine']);
  });
});

describe('review requirements handed to the matcher', () => {
  it('uses current task runtime in hours ahead of old needs, preserves unknowns, and respects the 24-hour bound', () => {
    const { project } = libraryProject();
    project.factOverrides.runtime_continuous_min = 120;
    const inferred = requirementsFor(project);
    expect(inferred.success && inferred.data.runtime_h_per_shift).toBe(2);
    project.needs.runtime = '4';
    const explicit = requirementsFor(project);
    expect(explicit.success && explicit.data.runtime_h_per_shift).toBe(2);
    project.factOverrides.runtime_continuous_min = null;
    const unknown = requirementsFor(project);
    expect(unknown.success && unknown.data.runtime_h_per_shift).toBeUndefined();
    project.factOverrides.runtime_continuous_min = 0;
    const zero = requirementsFor(project);
    expect(zero.success && zero.data.runtime_h_per_shift).toBeUndefined();
    project.factOverrides.runtime_continuous_min = 1500;
    expect(requirementsFor(project).success).toBe(false);
  });

  it('requires ATEX evidence only for a recorded hazardous-area requirement', () => {
    const { project } = libraryProject();
    project.factOverrides.dust = { type: 'wood', zone: 'atex' };
    const hazardous = requirementsFor(project);
    expect(hazardous.success && hazardous.data.certifications_required).toEqual(['ATEX']);
    project.factOverrides.dust = { type: 'wood', zone: 'controlled' };
    const controlled = requirementsFor(project);
    expect(controlled.success && controlled.data.certifications_required).toEqual([]);
    project.factOverrides.dust = null;
    const unknown = requirementsFor(project);
    expect(unknown.success && unknown.data.certifications_required).toEqual([]);
  });
});