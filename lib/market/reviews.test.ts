import { describe, expect, it } from 'vitest';
import { loadMarket } from './load';
import { reviewedIds, reviewsFor } from './reviews';

describe('public reviews', () => {
  it('belong to real market records and parse', () => {
    const ids = new Set(loadMarket().map((robot) => robot.id));
    for (const id of reviewedIds()) expect(ids.has(id), id).toBe(true);
    expect(reviewedIds().length).toBeGreaterThan(20);
  });
  it('marks a page that reviews a whole family', () => {
    const a = reviewsFor(['agibot-x2-ultra'])[0];
    expect(a.series).toBe(true);
  });
  it('label the maker quotes as such', () => {
    expect(reviewsFor(['okibo-eg7']).every((r) => r.kind === 'maker_testimonial')).toBe(true);
  });
});
