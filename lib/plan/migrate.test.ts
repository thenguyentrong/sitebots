import { describe, expect, it } from 'vitest';
import { factsFromNeeds, migrateV1, readWorkspace } from './migrate';
import { EMPTY_WORKSPACE, WorkspaceSchema, WorkspaceV1Schema, type ProjectV1 } from './model';

const id = '00000000-0000-4000-8000-000000000001';
const v1Project: ProjectV1 = {
  id, title: 'Assembly tote deliveries', jobId: 'transport', setting: 'factory', focus: 'humanoid', ideaId: 'totes',
  objective: 'Fewer trips', baseline: 'Carts by hand', description: 'We carry totes.',
  needs: { payload: '12', reach: '', runtime: '', terrain: 'paved', stairs: '', environment: 'indoor', autonomy: '' },
  variability: 'medium', value: 'high', readiness: 'medium', rationale: 'r', gate: 'unknown', gateNote: '',
  options: [{ id: 'amr', name: 'AMR with carts', kind: 'custom', package: '', operator: '', evidence: '', costs: { initial: '120000', hours: '1800', rate: '40', cashShare: '50', annual: '12000' } }],
  selectedOptionId: 'amr',
  pilot: { scope: 'Two stations', success: 'Trips completed', stop: '', owner: 'Ops', date: '' },
};
const v1 = { version: 1 as const, activeId: id, projects: [v1Project] };

describe('workspace migration', () => {
  it('carries a version-one draft into a custom task with its facts, options and priorities', () => {
    const ws = migrateV1(WorkspaceV1Schema.parse(v1));
    expect(WorkspaceSchema.safeParse(ws).success).toBe(true);
    const project = ws.projects[0];
    expect(project.title).toBe('Assembly tote deliveries');
    expect(project.task).toMatchObject({ kind: 'custom', family: 'intralogistics_transport' });
    expect(project.task.kind === 'custom' && project.task.facts).toMatchObject({ object_mass_kg: { min: 0, max: 12 }, variability: 'medium', environment: 'indoor', floor: 'level', dust: null });
    expect(project.solutionClasses).toEqual(['humanoid']);
    expect(project.options[0].costs.initial).toBe('120000');
    expect(project.value).toBe('high');
    expect(ws.context.group).toBe('factory');
    expect(ws.context.dustZone).toBe('not_sure');
  });

  it('turns unanswered needs into unknown facts, never into defaults', () => {
    const facts = factsFromNeeds({ ...v1Project, needs: { payload: '', reach: '', runtime: '', terrain: '', stairs: '', environment: '', autonomy: '' }, variability: '' });
    expect(Object.values(facts).every((value) => value === null)).toBe(true);
    expect(factsFromNeeds({ ...v1Project, needs: { ...v1Project.needs, stairs: 'required', terrain: 'rubble' } }).floor).toBe('stairs');
  });

  it('reads the current key first and falls back to the old one', () => {
    const current = readWorkspace(JSON.stringify(migrateV1(v1)), JSON.stringify(v1));
    expect(current).toMatchObject({ migrated: false, error: false });
    expect(current.workspace.projects).toHaveLength(1);
    const legacy = readWorkspace(null, JSON.stringify(v1));
    expect(legacy).toMatchObject({ migrated: true, error: false });
    expect(legacy.workspace.version).toBe(2);
  });

  it('rescues the old draft when the current key is corrupt, and reports corruption otherwise', () => {
    const rescued = readWorkspace('{not json', JSON.stringify(v1));
    expect(rescued).toMatchObject({ migrated: true, error: true });
    expect(rescued.workspace.projects[0].title).toBe('Assembly tote deliveries');
    expect(readWorkspace('{"version":9}', null)).toMatchObject({ workspace: EMPTY_WORKSPACE, migrated: false, error: true });
    expect(readWorkspace(null, null)).toMatchObject({ workspace: EMPTY_WORKSPACE, migrated: false, error: false });
  });

  it('the current schema rejects the old version outright', () => {
    expect(WorkspaceSchema.safeParse(v1).success).toBe(false);
    expect(WorkspaceSchema.safeParse({ version: 2, activeId: '', projects: [] }).success).toBe(true);
  });
});
