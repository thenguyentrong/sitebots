import { describe, expect, it } from 'vitest';
import { smallHumanoid } from '@/lib/match/fixtures';
import type { Candidate } from '@/lib/match/types';
import type { SpecValue, Specs } from '@/lib/spec/types';
import { evidenceForAxis, hasValue, profileEvidenceSummary } from './evidence';

const fact = (value: SpecValue['value'], extra: Partial<SpecValue> = {}): SpecValue => ({ value, source_url: 'https://maker.example/spec', source_tier: 1, observed_at: '2026-10-02', confidence: 1, trust: 'verified', ...extra });
const candidate = (specs: Specs): Candidate => ({ ...smallHumanoid, card: { ...smallHumanoid.card, specs } });

describe('profile evidence and follow-ups', () => {
  it('preserves explicit no, zero and range evidence but excludes empty values', () => {
    expect(hasValue(fact(false))).toBe(true);
    expect(hasValue(fact(0))).toBe(true);
    expect(hasValue(fact(null, { min: 2, max: 4 }))).toBe(true);
    expect(hasValue(fact(null))).toBe(false);
    expect(hasValue(fact([]))).toBe(false);
    const result = evidenceForAxis(candidate({ outdoor_rated: fact(false), temp_min_c: fact(0), temp_max_c: fact(40), ip_rating: fact('IP54') }), 'weather');
    expect(result.facts.find(f => f.key === 'outdoor_rated')?.value).toBe('No');
    expect(result.missing).toEqual([]);
  });
  it('requires both temperature limits and loaded rather than nominal runtime', () => {
    expect(evidenceForAxis(candidate({ temp_min_c: fact(0) }), 'weather').missing).toContain('Complete operating temperature range');
    const result = evidenceForAxis(candidate({ 'runtime_h:unstated': fact(4) }), 'endurance');
    expect(result.facts[0].label).toContain('basis unstated');
    expect(result.missing).toContain('Loaded working runtime with workload stated');
  });
  it('retains trust, provenance and measurement conditions without promoting seller claims', () => {
    const result = evidenceForAxis(candidate({ 'payload_kg:rated': fact(5, { trust: 'reported', source_tier: 2, evidence_url: 'https://seller.example/exact', note: 'Horizontal arm; seller only.' }) }), 'carry');
    expect(result.facts[0]).toMatchObject({ trust: 'reported', sourceUrl: 'https://seller.example/exact', note: 'Horizontal arm; seller only.', checkedAt: '2026-10-02' });
    expect(result.missing).toContain('Manufacturer confirmation of the reported working-load figure');
  });
  it('accepts a sourced sustained working load and does not turn rough ground into gravel/rubble evidence', () => {
    expect(evidenceForAxis(candidate({ 'payload_kg:sustained': fact(14) }), 'carry').missing).toEqual([]);
    expect(evidenceForAxis(candidate({ terrain_notes: fact('Uneven ground') }), 'terrain').missing).toContain('Reviewed evidence for gravel and rubble separately');
  });
  it('counts field provenance and deduplicates source links', () => {
    const summary = profileEvidenceSummary(candidate({ height_m: fact(1.4), outdoor_rated: fact(false), weight_kg: fact(40, { trust: 'reported', source_url: 'https://seller.example/spec', observed_at: '2026-10-01' }), runtime_h: fact(null) }));
    expect(summary).toMatchObject({ published: 3, verified: 2, reported: 1, sources: 2, latest: '2026-10-02' });
  });
});

it('keeps a working-load follow-up for upper-only payload and runtime ranges', () => {
  for (const [axis, key] of [['carry', 'payload_kg:rated'], ['endurance', 'runtime_h:loaded']]) {
    const result = evidenceForAxis(candidate({ [key]: fact(null, { max: 4 }) }), axis);
    expect(result.facts).toHaveLength(1);
    expect(result.facts[0].value).toContain('≤');
    expect(result.missing.length).toBeGreaterThan(0);
  }
});
