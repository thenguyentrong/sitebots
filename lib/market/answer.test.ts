import { describe, expect, it } from 'vitest';
import { LINEUP } from '@/lib/models/lineup';
import { loadAnswer } from './answer';
import { loadJobMap, loadJobs } from './jobs';
import { ORDERABLE, STAGE_RANK } from './match';
import { PROOF } from './vocab';

// The landing's answer is counted from the committed records: these hold whatever the data says.
describe('the landing answer', () => {
  const answer = loadAnswer(LINEUP.map((robot) => robot.href));
  const { jobs } = loadJobs();

  it('counts every construction-site job once, by its best proof', () => {
    expect(answer.checked).toBe(jobs.filter((job) => job.where === 'site').length);
    expect(PROOF.reduce((sum, level) => sum + answer.levels[level], 0)).toBe(answer.checked);
    expect(answer.proven.length).toBe(answer.levels.deployment + answer.levels.pilot);
    expect(answer.shown.length).toBe(answer.levels.demo + answer.levels.claim);
  });

  it('counts a job as done only on a named project, never on a fit on paper', () => {
    for (const job of answer.proven) {
      expect(STAGE_RANK[job.best.stage], job.id).toBeGreaterThanOrEqual(STAGE_RANK.pilot);
      expect(job.best.where, job.id).toBeTruthy();
    }
  });

  it('names a robot to buy only when it can be ordered in Germany', () => {
    for (const job of [...answer.proven, ...answer.shown]) if (job.buy) expect(ORDERABLE, job.id).toContain(job.buy.status);
    expect(answer.inUseHere).toBe(answer.proven.filter((job) => job.buy?.stage === 'deployment').length);
    expect(answer.inUseHere).toBeLessThanOrEqual(answer.levels.deployment);
  });

  it('agrees with the map dots on how far each job is proven', () => {
    const { points } = loadJobMap();
    for (const job of [...answer.proven, ...answer.shown]) {
      const point = points.find((item) => item.id === job.id)!;
      expect(PROOF[point.counts.all.world], job.id).toBe(job.level);
    }
  });

  it('puts every site job under one trade and one kind of work, with paper and proof inside the total', () => {
    const squares = answer.trades.flatMap((trade) => trade.jobs.map((job) => job.id));
    expect(squares.length).toBe(answer.checked);
    expect(new Set(squares).size).toBe(answer.checked);
    expect(answer.kinds.reduce((sum, kind) => sum + kind.jobs, 0)).toBe(answer.checked);
    for (const kind of answer.kinds) {
      expect(kind.paper, kind.id).toBeLessThanOrEqual(kind.jobs);
      expect(kind.proven, kind.id).toBeLessThanOrEqual(kind.jobs);
    }
    expect(answer.kinds.reduce((sum, kind) => sum + kind.proven, 0)).toBe(answer.levels.deployment + answer.levels.pilot);
  });

  it('knows how far each robot in the landing row got on site jobs', () => {
    expect(Object.keys(answer.lineup).sort()).toEqual(LINEUP.map((robot) => robot.href).sort());
  });
});
