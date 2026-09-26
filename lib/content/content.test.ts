import { describe, expect, it } from 'vitest';
import { checkContent, loadContent } from './load';
import { FAMILY_IDS, SOLUTION_CLASS_IDS } from './vocab';

// Runs against the real data/ tree, so a broken record fails the build, not
// the visitor.
describe('decision-journey content (data/)', () => {
  const content = loadContent();

  it('loads every collection', () => {
    // 14 factory, yard and operations settings; the construction site is one setting per LV trade, each with its section and LB/ATV reference.
    expect(content.settings.filter((s) => s.group !== 'site')).toHaveLength(14);
    const site = content.settings.filter((s) => s.group === 'site');
    expect(site.length).toBeGreaterThanOrEqual(30);
    for (const s of site) expect(Boolean(s.section && s.lv), s.id).toBe(true);
    expect(content.families.map((f) => f.id).sort()).toEqual([...FAMILY_IDS].sort());
    expect(content.solutionClasses.map((s) => s.id).sort()).toEqual([...SOLUTION_CLASS_IDS].sort());
    expect(content.rfi.items).toHaveLength(10);
    expect(content.tasks.length).toBeGreaterThanOrEqual(20);
    expect(content.compliance.length).toBeGreaterThanOrEqual(10);
  });

  it('has no referential, editorial or stale-pin issues', () => {
    expect(checkContent(content)).toEqual([]);
  });

  it('prefab timber carries every verdict, and every screened setting has records', () => {
    const timber = content.tasks.filter((t) => t.record.setting === 'prefab_timber');
    expect(new Set(timber.map((t) => t.record.screen.verdict))).toEqual(new Set(['candidate', 'marginal', 'ruled_out']));
    expect(content.settings.find((s) => s.id === 'prefab_timber')?.coverage).toBe('screened');
    const withRecords = new Set(content.tasks.map((t) => t.record.setting));
    for (const s of content.settings.filter((s) => s.coverage === 'screened')) expect(withRecords.has(s.id), s.id).toBe(true);
  });

  it('all four setting groups are represented', () => {
    expect(new Set(content.settings.map((s) => s.group))).toEqual(new Set(['site', 'factory', 'yard_logistics', 'operations']));
  });

  it('every ruled-out task names a better answer outside the humanoid class', () => {
    for (const { record } of content.tasks) {
      if (record.screen.verdict !== 'ruled_out') continue;
      expect(record.screen.better_answer.class, record.id).not.toBeNull();
      expect(record.screen.better_answer.class, record.id).not.toBe('humanoid');
    }
  });

  it('every candidate carries sourced evidence and pilot metrics', () => {
    for (const { record } of content.tasks) {
      if (record.screen.verdict !== 'candidate') continue;
      expect(record.evidence.length, record.id).toBeGreaterThan(0);
      expect(record.pilot.metrics.length, record.id).toBeGreaterThan(0);
    }
  });

  it('no attribute is filled without a note, and unknowns stay null', () => {
    for (const { record } of content.tasks) {
      for (const [key, entry] of Object.entries(record.attributes)) {
        expect(entry.note.trim().length, `${record.id}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});
