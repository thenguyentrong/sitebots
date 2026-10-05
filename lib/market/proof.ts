import type { CountKey, JobMapPoint, RobotJobStats } from './jobs';
import { STAGE_RANK } from './match';
import type { EvidenceStage } from './schema';
import { PROOF, type ProofLevel } from './vocab';

// Client-safe. How far a job is proven, read from the counts the map ships for every job.

export type JobProofLevel = {
  /** The best proof from any robot on the list, sold in Germany or not. */
  world: ProofLevel;
  /** The best proof from a robot you can buy or order in Germany. */
  here: ProofLevel;
  /** Robots have done more of this job elsewhere than any robot you can order here has. */
  abroad: boolean;
};

export function proofOf(point: Pick<JobMapPoint, 'counts'>, key: CountKey = 'all'): JobProofLevel {
  const { world, proof } = point.counts[key];
  return { world: PROOF[world], here: PROOF[proof], abroad: world > proof };
}

const plural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's');

/** The heading over the robots for a job: robots you can buy here that are proven on it first, then
 *  what only fits on paper. `fits` are the robots that fit outright. */
export function choicesHeading(fits: readonly { evidence: { stage: EvidenceStage } | null }[], any: number): string {
  const strong = fits.length;
  const proven = fits.filter((fit) => fit.evidence && STAGE_RANK[fit.evidence.stage] >= STAGE_RANK.pilot).length;
  if (proven) return plural(proven, 'robot') + ' you can buy in Germany ' + (proven > 1 ? 'have' : 'has') + ' done this job on real sites' + (strong > proven ? ' · ' + (strong - proven) + ' more fit' : '');
  if (strong) return 'No robot you can buy in Germany is proven on this job yet · ' + strong + ' fit' + (strong === 1 ? 's' : '') + ' what it needs';
  if (any) return 'No robot fits outright; ' + any + ' could with add-ons or a trial';
  return 'No robot you can buy in Germany yet';
}
// A card's proof line, by the robot's best proof on any job (STAGE_RANK).
const PROVEN_ON = ['', 'maker claim for', 'shown in a demo for', 'piloted on', 'in daily use on'];

/** What a robot's card says about its jobs: its best proof first, then what only fits on paper. */
export function jobsLine(stats: RobotJobStats | undefined): string {
  if (!stats || (!stats.best && !stats.strong)) return 'no job on the map yet';
  if (!stats.best) return 'no proof on a job yet · fits ' + plural(stats.strong, 'job') + ' on paper';
  const more = stats.strong - stats.atBest;
  return PROVEN_ON[stats.best] + ' ' + plural(stats.atBest, 'job') + (more > 0 ? ' · ' + more + ' more fit' : '');
}

/** Which job to open on, and which to list first: proven work before work that only fits on paper,
 *  work proven in Germany before work proven elsewhere, then the broader choice of robots. */
export function jobRank(point: Pick<JobMapPoint, 'counts' | 'where'>, key: CountKey = 'all'): number {
  const count = point.counts[key];
  return count.proof * 1000 + count.world * 100 + count.germany * 50 + Math.min(9, count.proven) * 4 + Math.min(19, count.strong) + (point.where === 'site' ? 2 : 0);
}
