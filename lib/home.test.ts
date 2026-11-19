import { describe, expect, it } from 'vitest';
import { buyGroups, industryFigures, labourShares } from './home';

describe('start page data', () => {
  it('shows only figures with a source page and the sentence they were read from', () => {
    const figures = industryFigures();
    expect(figures.length).toBeGreaterThanOrEqual(4);
    for (const f of figures) {
      expect(f.value).toBeTruthy();
      expect(f.source.url).toMatch(/^https:\/\//);
      expect(f.source.quote.length).toBeGreaterThan(10);
      if (f.also) expect(f.also.url).toMatch(/^https:\/\//);
    }
    expect(new Set(figures.map((f) => f.id)).size).toBe(figures.length);
  });

  it('ranks the trades by labour share and keeps the building trade for scale', () => {
    const { top, building, hourly } = labourShares();
    expect(top).toHaveLength(10);
    for (let i = 1; i < top.length; i++) expect(top[i - 1].value).toBeGreaterThanOrEqual(top[i].value);
    expect(building?.wz).toBe('41.20');
    expect(hourly?.value).toBeGreaterThan(30);
  });

  it('counts the robots a German buyer can order, per type', () => {
    const groups = buyGroups();
    expect(groups.length).toBeGreaterThanOrEqual(3);
    expect(groups.every((g) => g.count > 0)).toBe(true);
  });
});
