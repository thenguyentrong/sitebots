import { describe, expect, it } from 'vitest';
import { PROJECT_IDEAS, ideasFor, projectFromIdea, suggestJobs } from './intake';
import { readWorkspace } from './migrate';
import { newProject, requirementsFor, WorkspaceSchema } from './model';
const id = '00000000-0000-4000-8000-000000000001';

describe('finder intake', () => {
  it('suggests question sets from English and German descriptions without claiming a unique intent', () => {
    expect(suggestJobs('Sort finished timber parts into kits.').map((row) => row.job.id)).toEqual(['sorting']);
    expect(suggestJobs('Kisten transportieren und Teile sortieren').map((row) => row.job.id)).toEqual(['transport', 'sorting']);
    expect(suggestJobs('No cleaning, but inspect equipment').map((row) => row.job.id)).toEqual(['inspection']);
    expect(suggestJobs('We need help with our business')).toEqual([]);
  });
  it('filters humanoid ideas by actual setting instead of showing every job everywhere', () => {
    const factory = ideasFor('factory', 'humanoid');
    expect(factory.map((idea) => idea.id)).toEqual(['totes', 'wood-parts', 'machine']);
    expect(ideasFor('site', 'humanoid').map((idea) => idea.id)).toEqual(['site-delivery']);
    expect(ideasFor('yard', 'any').every((idea) => idea.settings.includes('yard'))).toBe(true);
  });
  it('seeds a practical trial while leaving site conditions, costs and capability evidence open', () => {
    const project = projectFromIdea(id, PROJECT_IDEAS.find((idea) => idea.id === 'wood-parts')!, 'factory', 'humanoid');
    expect(project.description).toContain('wood factory');
    expect(project.pilot.scope).toContain('surface damage');
    expect(Object.values(project.needs).every((value) => value === '')).toBe(true);
    expect(project.options).toEqual([]);
    expect(project.gate).toBe('unknown');
    const parsed = requirementsFor(project);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toMatchObject({ tasks: ['material_sorting'], form_factor: 'humanoid', environment: undefined, payload_kg: undefined });
  });
  it('keeps machine tending a research task instead of inventing a catalogue capability', () => {
    const project = projectFromIdea(id, PROJECT_IDEAS.find((idea) => idea.id === 'machine')!, 'factory', 'humanoid');
    const parsed = requirementsFor(project);
    expect(parsed.success && parsed.data.tasks).toEqual([]);
    expect(parsed.success && parsed.data.form_factor).toBe('humanoid');
    expect(project.pilot.scope).toContain('machine inactive');
  });
  it('loads existing version-one assessments without losing them when new optional fields are absent', () => {
    const old = newProject(id, 'transport', 'factory');
    const { focus: _focus, ideaId: _ideaId, task: _task, factOverrides: _o, solutionClasses: _s, screenConfirmedAt: _c, ...oldProject } = old;
    const { workspace, migrated } = readWorkspace(null, JSON.stringify({ version: 1, activeId: id, projects: [oldProject] }));
    expect(migrated).toBe(true);
    expect(WorkspaceSchema.safeParse(workspace).success).toBe(true);
    expect(workspace.projects[0].focus).toBe('any');
    expect(workspace.projects[0].ideaId).toBe('');
    expect(workspace.projects[0].title).toBe(old.title);
    expect(workspace.projects[0].task).toMatchObject({ kind: 'custom', family: 'intralogistics_transport' });
  });
});
