import { describe, expect, it } from 'vitest';
import type { Specs, SpecValue } from './types';
import { conservativePayload, pickPayloadKey } from './payload';
import { coerceRow } from '@/lib/queries/coerce';
import { payload } from '@/lib/match/criteria';
import { smallHumanoid } from '@/lib/match/fixtures';
import { RequirementSchema } from '@/lib/match/requirements';

const claim = (value: number, tier = 1): SpecValue => ({ value, source_url: tier === 1 ? 'https://maker.example/load' : 'https://report.example/load', source_tier: tier, observed_at: '2026-10-01', confidence: 1, trust: tier === 1 ? 'verified' : 'reported' });

describe('payload evidence consistency', () => {
  it('keeps a manufacturer peak ahead of a weaker bilateral rating without inventing working capacity', () => {
    const specs: Specs = { 'payload_kg:peak': claim(2), 'payload_kg:rated_dual': claim(6, 3) };
    expect(pickPayloadKey(specs)).toBe('payload_kg:peak');
    expect(conservativePayload(specs)).toMatchObject({ key: 'payload_kg:peak', conservative: null, estimated: true });
    const card = coerceRow<typeof smallHumanoid.card>({ ...smallHumanoid.card, payload_kg_conservative: '6', specs: JSON.stringify(specs) });
    expect(card.payload_kg_conservative).toBeNull();
    expect(card.specs['payload_kg:rated_dual'].trust).toBe('reported');
    expect(payload({ ...smallHumanoid, card }, RequirementSchema.parse({ payload_kg: 3 }))?.status).toBe('unknown');
  });

  it('uses a supported working value rather than a stale numeric projection', () => {
    const card = { ...smallHumanoid.card, payload_kg_conservative: 50, specs: { 'payload_kg:rated': claim(2), 'payload_kg:peak': claim(6) } };
    expect(payload({ ...smallHumanoid, card }, RequirementSchema.parse({ payload_kg: 3 }))).toMatchObject({ status: 'fail', text: 'fails: 2 kg rated, one arm < 3 kg needed' });
    expect(coerceRow<typeof card>(card).payload_kg_conservative).toBe(2);
  });

  it('retains reported-only working payload as unconfirmed', () => {
    const card = { ...smallHumanoid.card, specs: { 'payload_kg:rated_dual': claim(20, 3) } };
    expect(payload({ ...smallHumanoid, card }, RequirementSchema.parse({ payload_kg: 12 }))).toMatchObject({ status: 'unknown' });
    expect(card.specs['payload_kg:rated_dual'].trust).toBe('reported');
  });

  it('uses the lower bound of a working range but does not certify an upper-only range', () => {
    expect(conservativePayload({ 'payload_kg:sustained': { ...claim(5), min: 2, max: 8 } }).conservative).toBe(2);
    expect(conservativePayload({ 'payload_kg:sustained': { ...claim(8), max: 8 } }).conservative).toBeNull();
    expect(pickPayloadKey({ 'payload_kg:sustained': { ...claim(8), max: 8 } })).toBe('payload_kg:sustained');
  });

  it('does not choose empty or invalid numeric claims ahead of usable evidence', () => {
    expect(pickPayloadKey({ 'payload_kg:rated': { ...claim(1), value: null }, 'payload_kg:peak': claim(2) })).toBe('payload_kg:peak');
    expect(pickPayloadKey({ 'payload_kg:rated': claim(Number.NaN) })).toBeNull();
  });
});
