import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { IndustryId } from '@/lib/content/industries';
import { loadContent } from '@/lib/content/load';
import type { FamilyId } from '@/lib/content/vocab';
import { buildSimilarityLayout, CLUSTER_FOR_FAMILY, type OpportunitySeed } from '@/lib/discovery/model';
import { taskCards } from '@/lib/tasks/cards';
import { loadMarket, loadNeeds, type MarketRobot } from './load';
import { STAGE_RANK, fitRobot, isStrong, optionsForJob, type RobotFit } from './match';
import type { UseCaseNeeds } from './requirements';
import type { RobotType } from './schema';
import { toCard, type RobotCardData } from './cards';
import { robotHref } from './links';
import { stepStrip } from '@/lib/workflows/load';
import type { StepStripData } from '@/lib/workflows/url';
import type { ConditionId, WhereId } from './vocab';

// Server-side only. Every published use case as a point on the map, with the robots that fit it.

export { WHERE, type WhereId } from './vocab';

export type JobFits = { options: RobotFit[]; preorder: RobotFit[]; notSold: string[] };
export type JobPoint = {
  id: string; title: string; summary: string; setting: string; where: WhereId; family: FamilyId; clusterId: string;
  industries: IndustryId[]; href: string; needs: UseCaseNeeds | null; outdoor: boolean | null; conditions: ConditionId[]; x: number; y: number; fits: JobFits;
};

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
      fits: { options: fits.options, preorder: fits.preorder, notSold: fits.notSold.map((fit) => fit.robotId) },
    };
  });
  const robots = marketRobots.map((robot) => ({ ...toCard(robot), href: robotHref(robot.id) }));
  const loaded = { jobs, robots, marketRobots, familyOf, needs };
  cache = { loaded, at: Date.now() };
  return loaded;
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
export type TypeCount = { strong: number; any: number; proof: number; makers: number };
export type CountKey = 'all' | RobotType;
export type JobCounts = Record<CountKey, TypeCount>;
/** A dot on the map: only what drawing, filtering and the panel header need. */
export type JobMapPoint = Omit<JobPoint, 'fits' | 'needs' | 'industries'> & { needs: Pick<UseCaseNeeds, 'movement' | 'handWork' | 'maxObjectKg' | 'tool'> | null; counts: JobCounts };
/** `workflow`: the task shown step by step, where a step flow exists. */
export type JobDetail = JobPoint & { robots: RobotCardData[]; workflow: StepStripData | null };
const KEYS: CountKey[] = ['all', 'humanoid', 'quadruped', 'mobile_manipulator', 'specialised'];

function countFits(fits: RobotFit[], typeOf: Map<string, RobotCardData>): JobCounts {
  const counts = Object.fromEntries(KEYS.map((key) => [key, { strong: 0, any: 0, proof: 0, makers: 0 }])) as JobCounts;
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
  for (const key of KEYS) counts[key].makers = makers[key].size;
  return counts;
}

export function loadJobMap(): { points: JobMapPoint[]; robots: RobotCardData[] } {
  const { jobs, robots } = loadJobs();
  const typeOf = new Map(robots.map((robot) => [robot.id, robot]));
  return {
    points: jobs.map(({ fits, industries: _industries, needs, ...job }) => ({
      ...job, needs: needs ? { movement: needs.movement, handWork: needs.handWork, maxObjectKg: needs.maxObjectKg, tool: needs.tool } : null, counts: countFits(fits.options, typeOf),
    })),
    robots,
  };
}

export function loadJobDetail(id: string): JobDetail | null {
  const { jobs, robots } = loadJobs();
  const job = jobs.find((item) => item.id === id);
  if (!job) return null;
  const ids = new Set([...job.fits.options.map((fit) => fit.robotId), ...job.fits.preorder.map((fit) => fit.robotId), ...job.fits.notSold]);
  return { ...job, robots: robots.filter((robot) => ids.has(robot.id)), workflow: stepStrip(job.id) };
}

/** The job the landing opens on: the broadest real choice, preferring construction work. */
export function defaultJobId(points: JobMapPoint[]): string | null {
  const breadth = (point: JobMapPoint) => (point.counts.humanoid.strong + point.counts.quadruped.strong + point.counts.mobile_manipulator.strong) * 3
    + point.counts.specialised.makers + (point.counts.all.proof ? 2 : 0) + (point.where === 'site' && point.counts.all.strong ? 5 : 0);
  // Construction-site work first: the site is for construction companies.
  const site = points.filter((point) => point.where === 'site' && point.counts.all.strong > 0);
  return [...(site.length ? site : points)].sort((a, b) => breadth(b) - breadth(a) || a.id.localeCompare(b.id))[0]?.id ?? null;
}
