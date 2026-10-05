import { describe, expect, it } from 'vitest';
import type { JobCounts, TypeCount } from './jobs';
import { choicesHeading, jobRank, jobsLine, proofOf } from './proof';

const count = (patch: Partial<TypeCount> = {}): TypeCount => ({ strong: 0, any: 0, proof: 0, makers: 0, world: 0, proven: 0, germany: 0, ...patch });
const point = (all: Partial<TypeCount>) => ({ where: 'site' as const, counts: { all: count(all), humanoid: count(), quadruped: count(), mobile_manipulator: count(), specialised: count() } as JobCounts });

describe('how far a job is proven', () => {
  it('reads the best proof from any robot and from robots sold here apart', () => {
    expect(proofOf(point({ world: 4, proof: 4 }))).toEqual({ world: 'deployment', here: 'deployment', abroad: false });
    expect(proofOf(point({ world: 4, proof: 1 }))).toEqual({ world: 'deployment', here: 'claim', abroad: true });
    expect(proofOf(point({ strong: 9 }))).toEqual({ world: 'none', here: 'none', abroad: false });
  });

  it('puts proven work a buyer here can get before the broadest fit on paper', () => {
    const paper = point({ strong: 19 });
    const abroad = point({ world: 4, strong: 2 });
    const here = point({ world: 4, proof: 4, proven: 1, strong: 1 });
    const german = point({ world: 4, proof: 4, proven: 1, germany: 1, strong: 1 });
    expect([paper, abroad, here, german].sort((a, b) => jobRank(b) - jobRank(a))).toEqual([german, here, abroad, paper]);
  });
});

describe('words for proof', () => {
  it('heads the robots for a job with the proven ones, never counting a fit on paper as done', () => {
    const fit = (stage: 'claim' | 'demo' | 'pilot' | 'deployment' | null) => ({ evidence: stage ? { stage } : null });
    expect(choicesHeading([fit('deployment'), fit(null), fit('claim')], 5)).toBe('1 robot you can buy in Germany has done this job on real sites · 2 more fit');
    expect(choicesHeading([fit(null), fit('demo')], 2)).toBe('No robot you can buy in Germany is proven on this job yet · 2 fit what it needs');
    expect(choicesHeading([], 3)).toBe('No robot fits outright; 3 could with add-ons or a trial');
  });

  it('says on a robot card how far it got before what it fits on paper', () => {
    expect(jobsLine({ strong: 54, best: 0, atBest: 0 })).toBe('no proof on a job yet · fits 54 jobs on paper');
    expect(jobsLine({ strong: 4, best: 4, atBest: 1 })).toBe('in daily use on 1 job · 3 more fit');
    expect(jobsLine({ strong: 2, best: 1, atBest: 2 })).toBe('maker claim for 2 jobs');
    expect(jobsLine(undefined)).toBe('no job on the map yet');
  });
});
