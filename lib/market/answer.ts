import { OPPORTUNITY_CLUSTERS } from '@/lib/discovery/model';
import { loadJobs, type JobPoint, type JobProof } from './jobs';
import { ORDERABLE, STAGE_RANK, isStrong } from './match';
import { PROOF, type ProofLevel } from './vocab';

// Server-side only. The landing's answer to "which jobs can robots do today, and where do you buy
// them in Germany", counted from the proof on the market records rather than from what fits on paper.

export type AnswerJob = {
  id: string; title: string; setting: string; href: string; level: ProofLevel;
  /** The best proof from any robot, and the best from a robot you can buy or order here, when there is one. */
  best: JobProof; buy: JobProof | null;
};
export type Answer = {
  /** Construction-site jobs on the map: the ones a builder can check. */
  checked: number;
  /** Jobs by their best proof from any robot. */
  levels: Record<ProofLevel, number>;
  /** Jobs that robots do in daily use or tried on a real site, best first. */
  proven: AnswerJob[];
  /** Jobs that only have a demo or a maker's word. */
  shown: AnswerJob[];
  /** Jobs in daily use with a robot you can buy or order in Germany that is itself in daily use on them. */
  inUseHere: number;
  /** Humanoids, robot dogs and mobile manipulators: how many are sold here and how far they got on site jobs. */
  general: { sold: number; levels: Record<ProofLevel, number>; robots: string[] };
  /** The robots in the landing's 3D row, by catalogue page, with their best proof on a site job. */
  lineup: Record<string, ProofLevel>;
  /** Every site job under its trade, proven trades first: one square per job in the trade chart. */
  trades: { name: string; jobs: TradeJob[] }[];
  /** Per kind of work: site jobs, those a robot sold here fits on paper, those done on real sites. */
  kinds: { id: string; label: string; jobs: number; paper: number; proven: number }[];
};
/** `abroad`: the best proof comes from robots not sold in Germany. */
export type TradeJob = { id: string; title: string; href: string; level: ProofLevel; abroad: boolean };

const PROVEN = STAGE_RANK.pilot;
const orderable = (proof: JobProof) => ORDERABLE.includes(proof.status);
const emptyLevels = () => Object.fromEntries(PROOF.map((level) => [level, 0])) as Record<ProofLevel, number>;
const rankOf = (proofs: JobProof[]) => proofs.reduce((best, proof) => Math.max(best, STAGE_RANK[proof.stage]), 0);
const germanProof = (proof: JobProof | null) => proof !== null && /germany|deutschland/i.test(proof.where ?? '');

function toAnswerJob(job: JobPoint): AnswerJob {
  const buy = job.proofs.find(orderable) ?? null;
  return {
    id: job.id, title: job.title, setting: job.setting, href: job.href, level: PROOF[rankOf(job.proofs)],
    best: job.proofs[0], buy,
  };
}

export function loadAnswer(lineupHrefs: readonly string[] = []): Answer {
  const { jobs, marketRobots } = loadJobs();
  const site = jobs.filter((job) => job.where === 'site');
  const levels = emptyLevels();
  for (const job of site) levels[PROOF[rankOf(job.proofs)]]++;
  const withProof = site.filter((job) => job.proofs.length).map(toAnswerJob);
  // Proven work a buyer here can get comes first, work proven in Germany before work proven abroad.
  const order = (a: AnswerJob, b: AnswerJob) => STAGE_RANK[b.best.stage] - STAGE_RANK[a.best.stage]
    || (b.buy ? STAGE_RANK[b.buy.stage] : 0) - (a.buy ? STAGE_RANK[a.buy.stage] : 0)
    || Number(germanProof(b.buy)) - Number(germanProof(a.buy)) || a.title.localeCompare(b.title);
  const proven = withProof.filter((job) => STAGE_RANK[job.best.stage] >= PROVEN).sort(order);
  const shown = withProof.filter((job) => STAGE_RANK[job.best.stage] < PROVEN).sort(order);

  const general = emptyLevels();
  const robots = new Set<string>();
  for (const job of site) {
    const proofs = job.proofs.filter((proof) => proof.robotType !== 'specialised');
    general[PROOF[rankOf(proofs)]]++;
    for (const proof of proofs) if (STAGE_RANK[proof.stage] >= PROVEN) robots.add(proof.name);
  }
  const sold = marketRobots.filter((robot) => robot.robotType !== 'specialised' && ORDERABLE.includes(robot.germany.status)).length;
  // A catalogue page can stand for several market versions (G1, G1 EDU, ...): the best of them counts.
  // Robot links point at the page's Germany section, so the page is the link without its hash.
  const page = (href: string) => href.split('#')[0];
  const lineup = Object.fromEntries(lineupHrefs.map((href) => [href, PROOF[rankOf(site.flatMap((job) => job.proofs.filter((proof) => page(proof.href) === href)))]]));
  return {
    checked: site.length, levels, proven, shown,
    inUseHere: proven.filter((job) => job.buy?.stage === 'deployment').length,
    general: { sold, levels: general, robots: [...robots].sort() },
    lineup, trades: tradesOf(site), kinds: kindsOf(site),
  };
}

function tradeJob(job: JobPoint): TradeJob {
  const world = rankOf(job.proofs), here = rankOf(job.proofs.filter(orderable));
  return { id: job.id, title: job.title, href: job.href, level: PROOF[world], abroad: world > here };
}

/** Trades with proof first (most proven jobs, then the stronger proof), then the rest by size; inside a
 *  trade the stronger proof comes first, so each row reads from left to right. */
function tradesOf(site: JobPoint[]): Answer['trades'] {
  const byTrade = new Map<string, TradeJob[]>();
  for (const job of site) byTrade.set(job.setting, [...(byTrade.get(job.setting) ?? []), tradeJob(job)]);
  const rank = (job: TradeJob) => PROOF.indexOf(job.level);
  const proven = (jobs: TradeJob[]) => jobs.filter((job) => rank(job) >= PROVEN).length;
  return [...byTrade].map(([name, jobs]) => ({ name, jobs: [...jobs].sort((a, b) => rank(b) - rank(a) || a.title.localeCompare(b.title)) }))
    .sort((a, b) => proven(b.jobs) - proven(a.jobs) || rank(b.jobs[0]) - rank(a.jobs[0]) || b.jobs.length - a.jobs.length || a.name.localeCompare(b.name));
}

/** The spider chart's numbers: per kind of work, fits on paper (a robot you can buy here fits what the
 *  job needs) against done on real sites (daily use or a pilot, by any robot). */
function kindsOf(site: JobPoint[]): Answer['kinds'] {
  return OPPORTUNITY_CLUSTERS.flatMap((cluster) => {
    const jobs = site.filter((job) => job.clusterId === cluster.id);
    return jobs.length ? [{
      id: cluster.id, label: cluster.label, jobs: jobs.length,
      paper: jobs.filter((job) => job.fits.options.some(isStrong)).length,
      proven: jobs.filter((job) => rankOf(job.proofs) >= PROVEN).length,
    }] : [];
  });
}
