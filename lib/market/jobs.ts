import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { IndustryId } from '@/lib/content/industries';
import { loadContent } from '@/lib/content/load';
import type { FamilyId } from '@/lib/content/vocab';
import { buildSimilarityLayout, CLUSTER_FOR_FAMILY, type OpportunitySeed } from '@/lib/discovery/model';
import { taskCards } from '@/lib/tasks/cards';
import { loadMarket, loadNeeds, type MarketRobot } from './load';
import { ORDERABLE, STAGE_RANK, bestEvidence, fitRobot, isStrong, optionsForJob, type RobotFit } from './match';
import type { UseCaseNeeds } from './requirements';
import type { EvidenceStage, GermanyStatus, RobotType } from './schema';
import { priceText, toCard, type RobotCardData } from './cards';
import { robotHref } from './links';
import { stepStrip } from '@/lib/workflows/load';
import type { StepStripData } from '@/lib/workflows/url';
import type { ConditionId, WhereId } from './vocab';
import { jobRank } from './proof';

// Server-side only. Every published use case as a point on the map, with the robots that fit it.

export { WHERE, type WhereId } from './vocab';

export type JobFits = { options: RobotFit[]; preorder: RobotFit[] };
/** A robot's best proof for this exact job, from any robot on the list, sold in Germany or not: the
 *  question "can robots do this job today" does not stop at the border, buying one does. The order
 *  puts a buyer here first: stronger proof, then a robot you can order here, then work done in Germany. */
export type JobProof = {
  robotId: string; name: string; maker: string; href: string; robotType: RobotType; status: GermanyStatus; price: string;
  stage: EvidenceStage; task: string; where: string | null; date: string | null; url: string | null; photo: ProofPhoto | null;
};
/** `inUse`: the record marks the photo as the robot at work, not a product shot. */
export type ProofPhoto = { src: string; width: number; height: number; alt: string; credit: string; inUse: boolean };
export type JobPoint = {
  id: string; title: string; summary: string; setting: string; where: WhereId; family: FamilyId; clusterId: string;
  industries: IndustryId[]; href: string; needs: UseCaseNeeds | null; outdoor: boolean | null; conditions: ConditionId[]; x: number; y: number; fits: JobFits;
  /** Best first, see JobProof. */
  proofs: JobProof[];
};

const IN_GERMANY = /germany|deutschland/i;
const orderable = (status: GermanyStatus) => ORDERABLE.includes(status);
/** A photo of the robot at work where its record has one, else its product photo. */
function proofPhoto(robot: MarketRobot): ProofPhoto | null {
  const atWork = new Set(robot.images.filter((image) => image.kind === 'in_use').map((image) => image.url));
  const pictures = [robot.picture, ...robot.gallery].filter((picture) => picture !== null);
  const inUse = pictures.find((picture) => picture.sourceUrl && atWork.has(picture.sourceUrl));
  const pick = inUse ?? pictures[0];
  return pick ? { src: pick.src, width: pick.width, height: pick.height, alt: pick.alt, credit: pick.credit, inUse: Boolean(inUse) } : null;
}
function proofsFor(jobId: string, robots: readonly MarketRobot[]): JobProof[] {
  return robots.flatMap((robot) => {
    const best = bestEvidence(robot, jobId);
    return best ? [{
      robotId: robot.id, name: robot.name, maker: robot.maker, href: robotHref(robot.id), robotType: robot.robotType, status: robot.germany.status,
      price: priceText(toCard(robot)), stage: best.stage, task: best.task, where: best.where, date: best.date, url: best.url, photo: proofPhoto(robot),
    }] : [];
  }).sort((a, b) => STAGE_RANK[b.stage] - STAGE_RANK[a.stage] || Number(orderable(b.status)) - Number(orderable(a.status))
    || Number(IN_GERMANY.test(b.where ?? '')) - Number(IN_GERMANY.test(a.where ?? '')) || (b.date ?? '').localeCompare(a.date ?? '') || a.name.localeCompare(b.name));
}

const GROUP_WHERE: Record<string, WhereId> = { site: 'site', factory: 'factory', yard_logistics: 'yard', operations: 'building' };
const INDUSTRY_WHERE: Partial<Record<IndustryId, WhereId>> = {
  construction: 'site', manufacturing: 'factory', warehousing: 'yard', research_education: 'lab', facilities: 'building', energy: 'building',
  healthcare_logistics: 'building', retail_hospitality: 'building', agriculture: 'other', waste_recycling: 'other', mining: 'other',
};

type Opportunity = { id: string; title: string; summary: string; industries: IndustryId[]; family: FamilyId; setting: string };
function researchedOpportunities(): Opportunity[] {
  const dir = join(process.cwd(), 'data', 'discovery-opportunities');
  return readdirSync(dir).filter((name) => name.endsWith('.json')).sort()
    .flatMap((name) => JSON.parse(readFileSync(join(dir, name), 'utf8').replace(/^﻿/, '')).opportunities as Opportunity[]);
}

type Loaded = { jobs: JobPoint[]; robots: RobotCardData[]; marketRobots: MarketRobot[]; familyOf: Map<string, string>; needs: Map<string, UseCaseNeeds> };

const FLAT = new Set(['stationary', 'level_floors']);
/** Similar work: same task family, same kind of hand work and comparable ground. */
function relatedTo(id: string, family: string, needs: Map<string, UseCaseNeeds>, familyOf: Map<string, string>) {
  const own = needs.get(id);
  return (taskId: string) => {
    const other = needs.get(taskId);
    if (!own || !other || taskId === id) return false;
    if (familyOf.get(taskId) !== family) return false;
    return other.handWork === own.handWork && (other.movement === own.movement || (FLAT.has(other.movement) && FLAT.has(own.movement)));
  };
}
let cache: { loaded: Loaded; at: number } | null = null;
// Production and tests keep the result; development rebuilds after two seconds so edited records show up.
const KEEP_MS = process.env.NODE_ENV === 'production' || process.env.VITEST ? Infinity : 2000;

export function loadJobs(): Loaded {
  if (cache && Date.now() - cache.at < KEEP_MS) return cache.loaded;
  const content = loadContent();
  const marketRobots = loadMarket();
  const needs = loadNeeds();
  const settings = new Map(content.settings.map((setting) => [setting.id, setting]));
  const extra = new Map<string, { where: WhereId; outdoor: boolean | null; conditions: ConditionId[] }>();
  const seeds: OpportunitySeed[] = taskCards(content).map((task) => {
    const environment = task.facts.environment;
    const conditions: ConditionId[] = [];
    if (environment === 'indoor' || environment === 'both') conditions.push('indoor');
    if (environment === 'outdoor' || environment === 'both') conditions.push('outdoor');
    if (task.facts.dust && task.facts.dust.zone !== 'none') conditions.push('dust');
    if (task.facts.wet === 'damp' || task.facts.wet === 'rain') conditions.push('wet');
    extra.set(task.id, { where: GROUP_WHERE[settings.get(task.setting)?.group ?? ''] ?? 'other', outdoor: environment === null ? null : environment !== 'indoor', conditions });
    return {
      id: task.id, title: task.title.en, summary: task.summary.en, industries: task.industries, family: task.family, clusterId: CLUSTER_FOR_FAMILY[task.family],
      setting: settings.get(task.setting)?.title.en ?? task.setting, href: '/use-cases/' + task.setting + '/' + task.slug, reviewIds: [], kind: 'task',
      capabilities: task.capabilities_required, solutionClasses: task.solution_classes,
    };
  });
  for (const item of researchedOpportunities()) {
    if (extra.has(item.id)) continue;
    const where = INDUSTRY_WHERE[item.industries[0]] ?? 'other';
    const outdoor = /outdoor|field|yard/i.test(item.setting) ? true : null;
    extra.set(item.id, { where, outdoor, conditions: outdoor ? ['outdoor'] : ['factory', 'lab', 'building'].includes(where) ? ['indoor'] : [] });
    seeds.push({ id: item.id, title: item.title, summary: item.summary, industries: item.industries, family: item.family, clusterId: CLUSTER_FOR_FAMILY[item.family], setting: item.setting, href: '/use-cases/custom?opportunity=' + encodeURIComponent(item.id), reviewIds: [], kind: 'researched' });
  }
  const familyOf = new Map(seeds.map((seed) => [seed.id, seed.family as string]));
  const jobs = buildSimilarityLayout(seeds).map((point) => {
    const { where, outdoor, conditions } = extra.get(point.id)!;
    const job = { id: point.id, needs: needs.get(point.id) ?? null, outdoor, isRelated: relatedTo(point.id, point.family, needs, familyOf) };
    if (job.needs && (job.needs.movement === 'rough_ground' || job.needs.movement === 'stairs_ladders')) conditions.push('rough');
    const fits = optionsForJob(marketRobots, job);
    return {
      id: point.id, title: point.title, summary: point.summary, setting: point.setting, where, family: point.family, clusterId: point.clusterId,
      industries: point.industries, href: point.href, needs: job.needs, outdoor, conditions, x: point.x, y: point.y,
      fits: { options: fits.options, preorder: fits.preorder }, proofs: proofsFor(point.id, marketRobots),
    };
  });
  const robots = marketRobots.map((robot) => ({ ...toCard(robot), href: robotHref(robot.id) }));
  const loaded = { jobs, robots, marketRobots, familyOf, needs };
  cache = { loaded, at: Date.now() };
  return loaded;
}

/** Per robot, for its card: the jobs it fits outright, and its best proof on any job (0–4, see PROOF)
 *  with the number of jobs that reach it. A count of fits alone read as "can do 54 jobs". */
export type RobotJobStats = { strong: number; best: number; atBest: number };
export function robotJobStats(jobs: readonly JobPoint[]): Record<string, RobotJobStats> {
  const stats: Record<string, RobotJobStats> = {};
  for (const job of jobs) for (const fit of [...job.fits.options, ...job.fits.preorder]) {
    const row = stats[fit.robotId] ??= { strong: 0, best: 0, atBest: 0 };
    if (isStrong(fit)) row.strong++;
    const rank = fit.evidence ? STAGE_RANK[fit.evidence.stage] : 0;
    if (rank > row.best) { row.best = rank; row.atBest = 1; } else if (rank && rank === row.best) row.atBest++;
  }
  return stats;
}

export type RobotJob = { id: string; title: string; setting: string; clusterId: string; fit: RobotFit };
/** Every job a robot fits, best evidence first, for its details page. */
export function jobsForRobot(robotId: string): RobotJob[] {
  const { jobs, marketRobots, familyOf, needs } = loadJobs();
  const robot = marketRobots.find((item) => item.id === robotId);
  if (!robot) return [];
  return jobs.flatMap((job) => {
    const fit = fitRobot(robot, { id: job.id, needs: job.needs, outdoor: job.outdoor, isRelated: relatedTo(job.id, job.family, needs, familyOf) });
    return fit ? [{ id: job.id, title: job.title, setting: job.setting, clusterId: job.clusterId, fit }] : [];
  }).sort((a, b) => b.fit.score - a.fit.score || a.title.localeCompare(b.title));
}

// What the map needs per job: counts and the best proof per robot type. The cards for one
// job load on demand (app/api/market/job), so the landing does not ship every fit.
/** `proof`: the best proof (0–4, see PROOF) among robots you can buy or order in Germany; `world`: the
 *  best among all robots on the list; `proven`: robots you can order here with proof for this job;
 *  `germany`: 1 when one of them was tried or used in Germany. */
export type TypeCount = { strong: number; any: number; proof: number; makers: number; world: number; proven: number; germany: number };
export type CountKey = 'all' | RobotType;
export type JobCounts = Record<CountKey, TypeCount>;
/** A dot on the map: only what drawing, filtering and the panel header need. */
export type JobMapPoint = Omit<JobPoint, 'fits' | 'needs' | 'industries' | 'proofs'> & { needs: Pick<UseCaseNeeds, 'movement' | 'handWork' | 'maxObjectKg' | 'tool'> | null; counts: JobCounts };
/** `workflow`: the task shown step by step, where a step flow exists. */
export type JobDetail = JobPoint & { robots: RobotCardData[]; workflow: StepStripData | null };
const KEYS: CountKey[] = ['all', 'humanoid', 'quadruped', 'mobile_manipulator', 'specialised'];

function countFits(fits: RobotFit[], proofs: JobProof[], typeOf: Map<string, RobotCardData>): JobCounts {
  const counts = Object.fromEntries(KEYS.map((key) => [key, { strong: 0, any: 0, proof: 0, makers: 0, world: 0, proven: 0, germany: 0 }])) as JobCounts;
  const makers = Object.fromEntries(KEYS.map((key) => [key, new Set<string>()]));
  for (const fit of fits) {
    const robot = typeOf.get(fit.robotId);
    if (!robot) continue;
    for (const key of ['all', robot.robotType] as CountKey[]) {
      counts[key].any++;
      if (!isStrong(fit)) continue;
      counts[key].strong++;
      makers[key].add(robot.maker);
      if (fit.evidence) counts[key].proof = Math.max(counts[key].proof, STAGE_RANK[fit.evidence.stage]);
    }
  }
  for (const proof of proofs) for (const key of ['all', proof.robotType] as CountKey[]) {
    counts[key].world = Math.max(counts[key].world, STAGE_RANK[proof.stage]);
    if (!orderable(proof.status)) continue;
    counts[key].proven++;
    if (STAGE_RANK[proof.stage] >= STAGE_RANK.pilot && IN_GERMANY.test(proof.where ?? '')) counts[key].germany = 1;
  }
  for (const key of KEYS) counts[key].makers = makers[key].size;
  return counts;
}

export function loadJobMap(): { points: JobMapPoint[]; robots: RobotCardData[] } {
  const { jobs, robots } = loadJobs();
  const typeOf = new Map(robots.map((robot) => [robot.id, robot]));
  return {
    points: jobs.map(({ fits, industries: _industries, needs, proofs, ...job }) => ({
      ...job, needs: needs ? { movement: needs.movement, handWork: needs.handWork, maxObjectKg: needs.maxObjectKg, tool: needs.tool } : null, counts: countFits(fits.options, proofs, typeOf),
    })),
    robots,
  };
}

export function loadJobDetail(id: string): JobDetail | null {
  const { jobs, robots } = loadJobs();
  const job = jobs.find((item) => item.id === id);
  if (!job) return null;
  const ids = new Set([...job.fits.options.map((fit) => fit.robotId), ...job.fits.preorder.map((fit) => fit.robotId)]);
  return { ...job, robots: robots.filter((robot) => ids.has(robot.id)), workflow: stepStrip(job.id) };
}

/** The job the landing opens on: construction work that robots you can buy here already do, so the
 *  first answer a visitor sees is a proven one, not the broadest fit on paper. */
export function defaultJobId(points: JobMapPoint[]): string | null {
  const site = points.filter((point) => point.where === 'site' && point.counts.all.strong > 0);
  return [...(site.length ? site : points)].sort((a, b) => jobRank(b) - jobRank(a) || a.id.localeCompare(b.id))[0]?.id ?? null;
}
