import { describe, expect, it } from 'vitest';
import { loadJobDetail, loadJobMap, loadJobs } from './jobs';
import { isStrong } from './match';
import { reviewSoldInGermany } from './links';
import { loadMarket, loadNeeds } from './load';

// Integrity of the committed market records against the use-case library.
describe('market data', () => {
  const robots = loadMarket();
  const { jobs } = loadJobs();
  const statusOf = new Map(robots.map((robot) => [robot.id, robot.germany.status]));

  it('describes what every use case needs', () => {
    const needs = loadNeeds();
    expect(jobs.filter((job) => !needs.has(job.id)).map((job) => job.id)).toEqual([]);
  });

  it('never offers a robot that cannot be ordered in Germany', () => {
    for (const job of jobs) for (const fit of job.fits.options) expect(['buy_now', 'quote']).toContain(statusOf.get(fit.robotId));
  });

  it('tags evidence only with use cases that exist', () => {
    const ids = new Set(jobs.map((job) => job.id));
    const unknown = robots.flatMap((robot) => robot.evidence.flatMap((item) => item.taskIds.filter((id) => !ids.has(id)).map((id) => robot.id + ' → ' + id)));
    expect(unknown).toEqual([]);
  });

  it('keeps the map counts in step with the robots a job shows', () => {
    const { points } = loadJobMap();
    for (const point of points.slice(0, 60)) {
      const detail = loadJobDetail(point.id)!;
      expect(point.counts.all.strong, point.id).toBe(detail.fits.options.filter(isStrong).length);
      expect(point.counts.all.any, point.id).toBe(detail.fits.options.length);
      for (const fit of detail.fits.options) expect(detail.robots.some((robot) => robot.id === fit.robotId), fit.robotId).toBe(true);
    }
  });

  it('keeps robots that are not sold in Germany out of the decide flow', () => {
    for (const id of ['figure-03-bmw-sequencing', 'apptronik-apollo-original-bipedal-pilot', 'agility-digit-4-tote-handling']) expect(reviewSoldInGermany(id), id).toBe(false);
    expect(reviewSoldInGermany('unitree-g1-edu-dex3-research')).toBe(true);
  });

  it('gives every robot that is sold here a way to reach a seller', () => {
    const silent = robots.filter((robot) => (robot.germany.status === 'buy_now' || robot.germany.status === 'quote') && !robot.germany.sellers.some((seller) => seller.productUrl || seller.contactUrl || seller.email || seller.phone));
    expect(silent.map((robot) => robot.id)).toEqual([]);
  });
});
