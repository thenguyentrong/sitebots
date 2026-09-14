import { describe, expect, it } from 'vitest';
import { WorkspaceSchema, costResult, emptyCosts, newProject, nextAction, requirementsFor } from './model';
const projectId = '00000000-0000-4000-8000-000000000001';
describe('automation assessment', () => {
  it('keeps unasked conditions unknown even when the factory setting is selected', () => {
    const project = newProject(projectId, 'transport', 'factory');
    const parsed = requirementsFor(project);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toMatchObject({ tasks: ['carry_payload'], terrain: undefined, stairs: undefined, environment: undefined, autonomy: undefined });
    expect(WorkspaceSchema.safeParse({ version: 1, activeId: projectId, projects: [project] }).success).toBe(true);
  });
  it('rejects invalid requirements without replacing them with friendly defaults', () => {
    const project = newProject(projectId);
    project.needs.payload = '-3';
    expect(requirementsFor(project).success).toBe(false);
  });
  it('separates released capacity from realized cash savings', () => {
    const result = costResult({ initial: '120000', hours: '1800', rate: '40', cashShare: '50', annual: '12000' });
    expect(result).toMatchObject({ kind: 'ready', capacity: 72000, savings: 36000, net: 24000, payback: 5 });
    if (result.kind === 'ready') expect(result.years[5].cash).toBe(0);
  });
  it('keeps incomplete input distinct from known zero and negative return', () => {
    expect(costResult(emptyCosts()).kind).toBe('missing');
    expect(costResult({ initial: '100', hours: '0', rate: '40', cashShare: '0', annual: '10' })).toMatchObject({ kind: 'ready', net: -10, payback: null });
    expect(costResult({ initial: '100', hours: '10', rate: '40', cashShare: '101', annual: '10' }).kind).toBe('invalid');
  });
  it('exposes break-even sensitivity to achieved hours', () => {
    const costs = { initial: '120000', hours: '1800', rate: '40', cashShare: '50', annual: '12000' };
    expect(costResult(costs, 0.8)).toMatchObject({ kind: 'ready', net: 16800 });
    expect(costResult(costs, 1.2)).toMatchObject({ kind: 'ready', net: 31200 });
  });
  it('never lets a high priority override a blocker or missing critical evidence', () => {
    const project = { ...newProject(projectId), value: 'high' as const, readiness: 'high' as const, gate: 'confirmed' as const };
    expect(nextAction(project, true)).toContain('Resolve the blocker');
    expect(nextAction(project, false, true)).toContain('Confirm critical requirements');
    expect(nextAction({ ...project, gate: 'unknown' })).toContain('Confirm critical requirements');
  });
  it('rejects external script URLs and unsupported saved-draft versions', () => {
    expect(WorkspaceSchema.safeParse({ version: 2, activeId: '', projects: [] }).success).toBe(false);
    const project = newProject(projectId);
    project.options.push({ id: 'one', name: 'One', kind: 'robot', href: 'javascript:alert(1)', package: '', operator: '', evidence: '', costs: emptyCosts() });
    expect(WorkspaceSchema.safeParse({ version: 1, activeId: projectId, projects: [project] }).success).toBe(false);
  });
});
