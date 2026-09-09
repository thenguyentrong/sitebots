import { describe, expect, it } from 'vitest';
import * as fx from '@/lib/match/fixtures';
import type { Candidate } from '@/lib/match/types';
import { TASK_CAPABILITIES } from '@/lib/spec/enums';
import { AXES, profileFor, TASK_BUCKETS } from './profile';

const candidates = Object.values(fx).filter((v): v is Candidate => !!v && typeof v === 'object' && 'card' in (v as object));

function withPayload(base: Candidate, kg: number | null): Candidate {
  return { ...base, card: { ...base.card, payload_kg_conservative: kg, payload_kg_rated: kg } };
}

describe('profileFor', () => {
  it('has ten axes and every task in exactly one bucket', () => {
    expect(AXES).toHaveLength(10);
    const all = TASK_BUCKETS.flatMap((b) => b.tasks);
    expect([...all].sort()).toEqual([...TASK_CAPABILITIES].sort());
  });

  it('carry ladder is monotone in the rated payload', () => {
    const base = candidates[0];
    const scores = [3, 12, 45, 100].map((kg) => profileFor(withPayload(base, kg)).axes.find((a) => a.id === 'carry')!.score as number);
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    expect(scores[0]).toBe(0);
    expect(scores[3]).toBe(1);
  });

  it('unknown is a gap, never zero', () => {
    const base = candidates[0];
    const p = profileFor(withPayload(base, null));
    const carry = p.axes.find((a) => a.id === 'carry')!;
    expect(carry.score).toBeNull();
    expect(carry.status).toBe('unknown');
    for (const a of p.axes) if (a.status === 'unknown') expect(a.score).toBeNull();
  });

  it('a robot nobody assessed has every task unknown and a null task radar', () => {
    const base = candidates[0];
    const blank: Candidate = { ...base, card: { ...base.card, task_capabilities: [], specs: {} } };
    const p = profileFor(blank);
    expect(p.tasks.every((t) => t.status === 'unknown')).toBe(true);
    expect(p.radar.tasks.every((v) => v === null)).toBe(true);
  });

  it('scores the fixtures without throwing and keeps values in 0..1', () => {
    for (const c of candidates) {
      const p = profileFor(c);
      for (const a of p.axes) if (a.score !== null) expect(a.score).toBeGreaterThanOrEqual(0), expect(a.score).toBeLessThanOrEqual(1);
      expect(p.radar.site).toHaveLength(10);
      expect(p.radar.tasks).toHaveLength(17);
    }
  });
});
