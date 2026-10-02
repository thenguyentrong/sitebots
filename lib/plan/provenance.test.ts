import { describe, expect, it } from 'vitest';
import { loadContent } from '@/lib/content/load';
import { emptyContext } from '@/lib/context/schema';
import { factsFromRecord } from '@/lib/screen/record';
import { referenceContext, resolveFacts } from '@/lib/screen/engine';
import { toTaskCard } from '@/lib/tasks/cards';
import { projectFromCard } from './from-task';
import { WorkspaceSchema } from './model';
import { resolvedFactsOf, siteContext } from './screen';

const id = '00000000-0000-4000-8000-000000000001';
const evidenceUrl = 'https://example.com/source/task-mass';
function record() {
  const task = structuredClone(loadContent().tasks[0].record);
  task.attributes.object_mass_kg = { value: { min: 2, max: 4 }, confidence: 'confirmed', note: 'Source states the mass for this task.', evidence_url: evidenceUrl };
  return task;
}

describe('task evidence provenance', () => {
  it('keeps the evidence URL from a record through resolved facts', () => {
    const task = record();
    const source = factsFromRecord(task);
    expect(source.meta?.object_mass_kg?.evidence_url).toBe(evidenceUrl);
    const resolved = resolveFacts(source, {}, referenceContext(task.setting), { family: task.family, machineClassFamilies: {} });
    expect(resolved.object_mass_kg).toMatchObject({ evidence_url: evidenceUrl, confidence: 'confirmed', origin: 'record' });
  });

  it('keeps evidence through task card, saved snapshot, JSON/schema round trip and project resolution', () => {
    const project = projectFromCard(id, toTaskCard(record()), emptyContext());
    const workspace = WorkspaceSchema.parse(JSON.parse(JSON.stringify({ version: 2, activeId: id, context: emptyContext(), projects: [project] })));
    const stored = workspace.projects[0];
    expect(stored.task.kind === 'library' && stored.task.snapshot.meta.object_mass_kg.evidence_url).toBe(evidenceUrl);
    expect(resolvedFactsOf(stored, siteContext(stored)).object_mass_kg.evidence_url).toBe(evidenceUrl);
  });

  it('does not attach the original source to a visitor-supplied replacement value', () => {
    const project = projectFromCard(id, toTaskCard(record()), emptyContext());
    project.factOverrides.object_mass_kg = { min: 10, max: 12 };
    const resolved = resolvedFactsOf(project, siteContext(project)).object_mass_kg;
    expect(resolved).toEqual({ value: { min: 10, max: 12 }, origin: 'visitor' });
  });

  it('accepts old snapshots without evidence URLs while rejecting unsafe new link schemes', () => {
    const project = projectFromCard(id, toTaskCard(record()), emptyContext());
    if (project.task.kind !== 'library') throw new Error('Library fixture expected');
    delete project.task.snapshot.meta.object_mass_kg.evidence_url;
    const workspace = { version: 2, activeId: id, projects: [project] };
    expect(WorkspaceSchema.safeParse(workspace).success).toBe(true);
    project.task.snapshot.meta.object_mass_kg.evidence_url = 'javascript:alert(1)';
    expect(WorkspaceSchema.safeParse(workspace).success).toBe(false);
  });
});
