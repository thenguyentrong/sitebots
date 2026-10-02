import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PilotBrief } from '@/components/plan/PilotBrief';
import { loadContent } from '@/lib/content/load';
import { emptyContext } from '@/lib/context/schema';
import { toTaskCard } from '@/lib/tasks/cards';
import { projectFromCard } from './from-task';
import { emptyCosts, newProject } from './model';

vi.mock('@/components/plan/useAssessment', () => ({ useAssessment: () => ({ data: undefined, loading: false, error: undefined, retry: () => {} }) }));
const id = '00000000-0000-4000-8000-000000000001';

describe('printed decision brief', () => {
  it('prints resolved task values and their source even when legacy needs inputs are empty', () => {
    const record = structuredClone(loadContent().tasks[0].record);
    record.attributes.object_mass_kg = { value: { min: 10, max: 20 }, confidence: 'confirmed', note: 'Mass for the representative object.', evidence_url: 'https://example.com/printed-mass-source' };
    const project = projectFromCard(id, toTaskCard(record), emptyContext());
    const html = renderToStaticMarkup(createElement(PilotBrief, { project, update: () => {} }));
    const massRow = html.match(/data-brief-requirement="object_mass_kg"[\s\S]*?<\/div>/)?.[0];
    expect(massRow).toContain('10–20 kg');
    expect(massRow).toContain('Task record');
    expect(massRow).toContain('confirmed');
    expect(massRow).toContain('Source: https://example.com/printed-mass-source');
    expect(html).toContain('data-plan-brief');
  });

  it('keeps unknown task requirements open even with a manually confirmed custom solution', () => {
    const project = newProject(id);
    project.gate = 'confirmed';
    project.gateNote = 'Supplier conversation recorded.';
    project.value = 'high';
    project.readiness = 'high';
    project.options = [{ id: 'custom', name: 'Custom cell', kind: 'custom', package: 'Robot and tooling', operator: 'Supervisor', evidence: 'Supplier reference', costs: emptyCosts() }];
    const html = renderToStaticMarkup(createElement(PilotBrief, { project, update: () => {} }));
    expect(html).toContain('0 of 12 task requirements provided');
    expect(html).toContain('Open question: What is the heaviest object');
    expect(html).toContain('Confirm critical requirements with the supplier and a representative test before committing to a pilot.');
    expect(html).not.toContain('Scope a bounded pilot with measurable acceptance criteria before a purchase decision.');
  });
});
