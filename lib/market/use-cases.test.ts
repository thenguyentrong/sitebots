import { describe, expect, it } from 'vitest';
import { companyInsight, companySlugFor, marketCompanies, slugifyMaker } from './companies';
import { loadMarket } from './load';
import { countriesOf, loadUseCases, settingOf, useCaseStats } from './use-cases';

describe('use cases', () => {
  const uses = loadUseCases();
  it('count only shown jobs, each with a robot page and a source', () => {
    expect(uses.length).toBeGreaterThan(200);
    for (const use of uses) {
      expect(['deployment', 'pilot', 'demo']).toContain(use.stage);
      expect(use.href.startsWith('/')).toBe(true);
    }
    expect(uses.filter((use) => use.sourceUrl).length / uses.length).toBeGreaterThan(0.95);
  });
  it('add up in the metrics', () => {
    const stats = useCaseStats(uses);
    expect(stats.byStage.deployment + stats.byStage.pilot + stats.byStage.demo).toBe(stats.total);
    expect(stats.byRegion.reduce((sum, r) => sum + r.count, 0)).toBe(stats.total);
    expect(stats.bySetting.reduce((sum, s) => sum + s.count, 0)).toBe(stats.total);
  });
  it('sort a job into the setting a builder thinks in', () => {
    expect(settingOf(['site_drywall/joint-finishing'], 'Residential tower, 30 floors, Tokyo')).toBe('high_rise');
    expect(settingOf(['site_concrete_repair/x'], 'Engelbergtunnel A81 Leonberg')).toBe('underground');
    expect(settingOf(['site_painting/wall-ceiling-painting'], 'Office fit-out, Munich')).toBe('interior');
    expect(countriesOf('Construction sites in Tokyo, Japan')).toContain('JP');
  });
});

describe('companies', () => {
  it('use the catalogue slug where the catalogue has the maker', () => {
    const g1 = loadMarket().find((robot) => robot.id === 'unitree-g1')!;
    expect(companySlugFor(g1)).toBe('unitree');
    expect(slugifyMaker('Husqvarna Construction Products AB')).toBe('husqvarna-construction-products');
  });
  it('give every robot one company and count its strengths from the records', () => {
    const total = [...marketCompanies().values()].reduce((sum, c) => sum + c.robots.length, 0);
    expect(total).toBe(loadMarket().length);
    const unitree = marketCompanies().get('unitree')!;
    const insight = companyInsight(unitree.robots);
    expect(insight.doesWhat).toMatch(/humanoid/);
    expect(insight.strengths.join(' ')).toMatch(/ordered in Germany/);
  });
});
