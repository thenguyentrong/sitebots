import { describe, expect, it } from 'vitest';
import { ComplianceEntry, CostLineTemplate, Partner, Provenance, RfiFile } from './implementation-schema';
import { missingGerman } from './l10n';
import { loadContent } from './load';
import { TaskRecord } from './schema';

const base = () => structuredClone(loadContent().tasks.find((t) => t.record.id === 'prefab_timber/fittings-kitting')!.record);
const issuePaths = (r: ReturnType<typeof TaskRecord.safeParse>) => (r.success ? [] : r.error.issues.map((i) => i.path.join('.')));

describe('TaskRecord', () => {
  it('accepts a real record', () => {
    expect(TaskRecord.safeParse(base()).success).toBe(true);
  });

  it('a confirmed attribute needs its evidence URL', () => {
    const t = base();
    t.attributes.environment = { value: 'indoor', confidence: 'confirmed', note: 'says who' };
    expect(issuePaths(TaskRecord.safeParse(t))).toContain('attributes.environment.evidence_url');
  });

  it('rejects an unknown capability or solution class', () => {
    const t = base() as unknown as Record<string, unknown>;
    expect(TaskRecord.safeParse({ ...t, capabilities_required: ['fly'] }).success).toBe(false);
    expect(TaskRecord.safeParse({ ...t, solution_classes: ['drone_swarm'] }).success).toBe(false);
  });

  it('a ruled-out task names its better answer and the rules that failed', () => {
    const t = base();
    t.screen.verdict = 'ruled_out';
    t.screen.better_answer.class = null;
    const paths = issuePaths(TaskRecord.safeParse(t));
    expect(paths).toContain('screen.better_answer.class');
    expect(paths).toContain('screen.killed_by');
  });

  it('a candidate needs evidence', () => {
    const t = base();
    t.evidence = [];
    expect(issuePaths(TaskRecord.safeParse(t))).toContain('evidence');
  });

  it('variability must be declared a judgement', () => {
    const t = base();
    t.attributes.variability.note = 'Hundreds of items.';
    expect(issuePaths(TaskRecord.safeParse(t))).toContain('attributes.variability.note');
  });

  it('the id must start with the setting', () => {
    const t = base();
    t.setting = 'precast_concrete';
    expect(issuePaths(TaskRecord.safeParse(t))).toContain('id');
  });

  it('missingGerman finds an empty translation anywhere', () => {
    const t = base();
    t.pilot.scope_hint.de = '';
    t.prerequisites[0].de = '  ';
    expect(missingGerman(t)).toEqual(['pilot.scope_hint', 'prerequisites[0]']);
    expect(missingGerman(base())).toEqual([]);
  });
});

describe('implementation content schemas', () => {
  const prov = { source_url: 'https://example.org/x', tier: 1, observed_at: '2026-09-24', confidence: 'confirmed' as const };

  it('confirmed provenance needs a tier 0–2 source', () => {
    expect(Provenance.safeParse(prov).success).toBe(true);
    expect(Provenance.safeParse({ ...prov, tier: 3 }).success).toBe(false);
    expect(Provenance.safeParse({ ...prov, tier: 3, confidence: 'likely' }).success).toBe(true);
    expect(Provenance.safeParse({ ...prov, source_url: 'http://example.org/x' }).success).toBe(false);
  });

  it('a partner may only claim free or neutral with a note quoting the source', () => {
    const p = { id: 'x', type: 'integrator', name: 'X', region: ['DE'], offers: { en: 'Free first call', de: 'Kostenloses Erstgespräch' }, url: 'https://example.org', provenance: prov, verification: 'indexed' };
    expect(Partner.safeParse(p).success).toBe(false);
    expect(Partner.safeParse({ ...p, note: { en: 'Source says "free first call".', de: 'Quelle sagt "kostenloses Erstgespräch".' } }).success).toBe(true);
    expect(Partner.safeParse({ ...p, offers: { en: 'Integration services', de: 'Integrationsleistungen' } }).success).toBe(true);
  });

  it('the RFI file holds exactly ten ordered items', () => {
    const item = (order: number) => ({ id: `rfi.${String(order).padStart(2, '0')}`, order, title: { en: 't', de: 't' }, why: { en: 'w', de: 'w' }, good_answer: { en: 'g', de: 'g' } });
    expect(RfiFile.safeParse({ items: Array.from({ length: 10 }, (_, i) => item(i + 1)) }).success).toBe(true);
    expect(RfiFile.safeParse({ items: Array.from({ length: 9 }, (_, i) => item(i + 1)) }).success).toBe(false);
    expect(RfiFile.safeParse({ items: Array.from({ length: 10 }, (_, i) => item(i === 9 ? 5 : i + 1)) }).success).toBe(false);
  });

  it('a cost line id carries its block letter and a sane range', () => {
    const line = { id: 'a.robot', block: 'A', label: { en: 'l', de: 'l' }, note: { en: 'n', de: 'n' }, unit: 'lump_sum', recurring: false, mandatory: true };
    expect(CostLineTemplate.safeParse(line).success).toBe(true);
    expect(CostLineTemplate.safeParse({ ...line, block: 'B' }).success).toBe(false);
    expect(CostLineTemplate.safeParse({ ...line, typical_range: { low: 10, high: 5, currency: 'EUR', basis: { en: 'b', de: 'b' }, provenance: prov } }).success).toBe(false);
  });

  it('an upcoming compliance entry carries its date', () => {
    const entry = {
      id: 'x_rule', kind: 'regulation', jurisdiction: 'EU', term_de: 'X', term_en: 'X', official_reference: 'X', url: 'https://example.org',
      status: 'upcoming', triggers: ['always'], what_it_means: { en: 'w', de: 'w' }, consequence: { en: 'c', de: 'c' }, action: { en: 'a', de: 'a' }, provenance: prov,
    };
    expect(ComplianceEntry.safeParse(entry).success).toBe(false);
    expect(ComplianceEntry.safeParse({ ...entry, applies_from: '2027-01-20' }).success).toBe(true);
  });
});
