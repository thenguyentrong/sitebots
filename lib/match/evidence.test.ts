import { describe, expect, it } from 'vitest';
import { smallHumanoid, siteQuadruped } from './fixtures';
import { DEFAULT_REQUIREMENTS, RequirementSchema } from './requirements';
import { evaluateAll, runtime, tasks, temperature } from './criteria';
import { taskRows } from '@/lib/profile/tasks';

describe('evidence boundaries', () => {
  it('does not evaluate unasked physical conditions', () => {
    expect(DEFAULT_REQUIREMENTS.terrain).toBeUndefined();
    expect(DEFAULT_REQUIREMENTS.environment).toBeUndefined();
    expect(DEFAULT_REQUIREMENTS.wet).toBeUndefined();
    expect(DEFAULT_REQUIREMENTS.stairs).toBeUndefined();
    expect(evaluateAll(smallHumanoid, DEFAULT_REQUIREMENTS, { today: new Date(), usdToEur: 1 }).map((row) => row.id)).toEqual(['evidence']);
  });
  it('absence from a capability list is unconfirmed, not impossible', () => {
    expect(tasks(smallHumanoid, RequirementSchema.parse({ tasks: ['drilling'] }))?.status).toBe('unknown');
    expect(taskRows(smallHumanoid).rows.find((row) => row.id === 'drilling')?.status).toBe('unknown');
  });
  it('a published battery swap does not override a no-swap requirement', () => {
    expect(runtime(siteQuadruped, RequirementSchema.parse({ runtime_h_per_shift: 8, hot_swap_acceptable: false }))?.status).toBe('fail');
  });
  it('does not pass a temperature range with a missing requested boundary', () => {
    const candidate = { ...siteQuadruped, card: { ...siteQuadruped.card, temp_max_c: null } };
    expect(temperature(candidate, RequirementSchema.parse({ temp_min_c: 0, temp_max_c: 35 }))?.status).toBe('unknown');
  });
});


describe('reported and estimated capability', () => {
  it('retains a reported task as needing manufacturer confirmation', () => {
    expect(tasks(smallHumanoid, RequirementSchema.parse({ tasks: ['carry_payload'] }))?.status).toBe('partial');
  });
  it('does not treat a fraction of a peak load as a proven working load', () => {
    const candidate = { ...smallHumanoid, card: { ...smallHumanoid.card, payload_kg_conservative: 50, specs: { 'payload_kg:peak': { value: 100, source_url: 'https://maker.example/spec', observed_at: '2026-09-14', source_tier: 1, confidence: 1, trust: 'verified' as const } } } };
    const result = evaluateAll(candidate, RequirementSchema.parse({ payload_kg: 20 }), { today: new Date(), usdToEur: 1 });
    expect(result.find((row) => row.id === 'payload')?.status).toBe('unknown');
  });
});
