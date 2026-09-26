import { describe, expect, it } from 'vitest';
import { loadContent } from '@/lib/content/load';
import { emptyContext } from '@/lib/context/schema';
import { emptyFacts } from '@/lib/screen/facts';
import { journeyContent, taskCards } from '@/lib/tasks/cards';
import { projectFromCard } from './from-task';
import { newProject, requirementsFor } from './model';
import { screenForSite } from './screen';

describe('the site check', () => {
  const content = loadContent();
  const families = journeyContent(content).machineClassFamilies;
  const cards = taskCards(content);
  const candidate = cards.find((c) => c.reference_verdict === 'candidate')!;

  it('starts every library task at its reference verdict', () => {
    const off = cards.filter((card) => screenForSite(projectFromCard('t', card, emptyContext()), families).verdict !== card.reference_verdict).map((c) => c.id);
    expect(off).toEqual([]);
  });

  it('moves the verdict with the answers for the site', () => {
    const r = screenForSite({ ...projectFromCard('t', candidate, emptyContext()), factOverrides: { dust: { type: 'mineral', zone: 'zone' } } }, families);
    expect(r.verdict).toBe('ruled_out');
    expect(r.killed_by).toContain('T2_dust');
  });

  it('keeps the process when the visitor already runs a machine for the step', () => {
    const r = screenForSite({ ...projectFromCard('t', candidate, emptyContext()), factOverrides: { incumbent_automation: { status: 'full', machine_classes: [] } } }, families);
    expect(r.verdict).toBe('ruled_out');
    expect(r.better_answer.class).toBe('keep_process');
  });

  it('assumes nothing for a task of your own', () => {
    const r = screenForSite({ ...newProject('t'), task: { kind: 'custom', family: 'intralogistics_transport', facts: emptyFacts() } }, families);
    expect(r.verdict).toBe('unscreened');
    expect(r.open_inputs).toContain('object_mass_kg');
  });

  it('asks the matcher for the facts the check reads, answers included', () => {
    const typical = requirementsFor(projectFromCard('t', candidate, emptyContext()));
    expect(typical.success && typical.data.environment).toBe(candidate.facts.environment);
    expect(typical.success && typical.data.dust).toBe('low');
    const dusty = requirementsFor({ ...projectFromCard('t', candidate, emptyContext()), factOverrides: { dust: { type: 'mineral', zone: 'zone' } } });
    expect(dusty.success && dusty.data.dust).toBe('high');
  });
});
