import { describe, expect, it } from 'vitest';
import { blocks, loadTradeShares } from './shares';

describe('trade cost shares', () => {
  const data = loadTradeShares();

  it('add up to the Rohbau and Ausbau totals Destatis prints', () => {
    for (const type of data.buildings.types) {
      const split = blocks(data, type.id);
      const totals = data.buildings.totals[type.id];
      expect(split.rohbau).toBeCloseTo(totals.rohbau, 0);
      expect(split.ausbau + split.tga).toBeCloseTo(totals.ausbau, 0);
      expect(totals.rohbau + totals.ausbau).toBeCloseTo(100, 1);
    }
  });

  it('keep each civil works index within 100 percent', () => {
    for (const type of data.civil.types) {
      const sum = data.civil.works.reduce((total, work) => total + (work.values[type.id] ?? 0), 0);
      expect(sum).toBeGreaterThan(95);
      expect(sum).toBeLessThanOrEqual(100.05);
    }
  });

  it('give labour shares as percentages with their branch codes', () => {
    expect(data.labour.length).toBeGreaterThan(10);
    for (const branch of data.labour) {
      expect(branch.wz).toMatch(/^4[123]([.][0-9]+)+$/);
      expect(branch.value).toBeGreaterThan(0);
      expect(branch.value).toBeLessThan(100);
    }
  });
});
