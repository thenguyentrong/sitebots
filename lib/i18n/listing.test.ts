import { describe, expect, it } from 'vitest';
import { buildIndex, searchIndex, type IndexRow } from '@/lib/compare/search';
import { manufacturerStatusLabel, manufacturerStatusLabels } from '@/lib/manufacturers';
import { companyInsight, marketCompanies } from '@/lib/market/companies';
import { jobsLine } from '@/lib/market/proof';
import { cardJobsLine } from './listing';

// The German words of the robots list, the company pages and the compare search. English stays the
// default everywhere, so code without a page language reads exactly as before.

describe('robot card job line', () => {
  it('is the English line unchanged and a German sentence on German pages', () => {
    const stats = { strong: 3, best: 3, atBest: 2 };
    expect(cardJobsLine(stats, 'en')).toBe(jobsLine(stats));
    expect(cardJobsLine(stats, 'de')).toBe('bei 2 Arbeiten im Pilotprojekt erprobt · 1 weitere passt');
    expect(cardJobsLine({ strong: 1, best: 0, atBest: 0 }, 'de')).toBe('passt zu 1 Arbeit');
    expect(cardJobsLine(undefined, 'de')).toBe('noch keine Arbeit auf der Karte');
  });
});

describe('company lines', () => {
  it('count the same facts in German', () => {
    const unitree = marketCompanies().get('unitree')!;
    const en = companyInsight(unitree.robots);
    const de = companyInsight(unitree.robots, 'de');
    expect(de.facts).toEqual(en.facts);
    expect(de.doesWhat).toMatch(/^Baut .*Humanoid/);
    expect(de.strengths.join(' ')).toMatch(/in Deutschland bestellbar/);
    expect(de.uses.regions.map((region) => region.count)).toEqual(en.uses.regions.map((region) => region.count));
  });
  it('name the manufacturer status in both languages', () => {
    expect(manufacturerStatusLabel('commercial')).toBe(manufacturerStatusLabels.commercial);
    expect(manufacturerStatusLabel('commercial', 'de')).toBe('Kommerzieller Anbieter');
  });
});

describe('compare search', () => {
  it('names the robot type in the asked language', () => {
    const rows: IndexRow[] = [{ id: 'uuid-h1', manufacturer_slug: 'unitree', manufacturer_name: 'Unitree', model_slug: 'h1', variant: 'base', name: 'Unitree H1', form_factor: 'quadruped', image_url: null }];
    const index = buildIndex([], rows, new Map());
    expect(searchIndex(index, 'h1')[0].type).toBe('Robot dog');
    expect(searchIndex(index, 'h1', 8, 'de')[0].type).toBe('Roboterhund');
    expect(Object.keys(searchIndex(index, 'h1', 8, 'de')[0]).sort()).toEqual(['id', 'maker', 'name', 'picture', 'type']);
  });
});
