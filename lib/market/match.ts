import type { UseCaseNeeds } from './requirements';
import type { Dossier, EvidenceStage, GermanyStatus } from './schema';

// Which robots on the German market fit a job. Pure: the map, the choices and the tests share it.

export type Check = 'yes' | 'add' | 'unknown' | 'no';
export type Verdict = 'done' | 'similar' | 'fits' | 'stretch';
/** isRelated says which other use cases count as similar work for this one. */
export type JobContext = { id: string; needs: UseCaseNeeds | null; outdoor: boolean | null; isRelated?: (taskId: string) => boolean };
export type BestEvidence = { stage: EvidenceStage; task: string; where: string | null; date: string | null; url: string | null };
export type RobotFit = {
  robotId: string;
  kind: 'general' | 'specialised';
  verdict: Verdict;
  evidence: BestEvidence | null;
  related: BestEvidence | null;
  checks: { move: Check; hands: Check; load: Check; outdoor: Check };
  score: number;
};

export const STAGE_RANK: Record<EvidenceStage, number> = { claim: 1, demo: 2, pilot: 3, deployment: 4 };
const STATUS_RANK: Record<GermanyStatus, number> = { buy_now: 3, quote: 2, preorder: 1, not_sold: 0 };
export const ORDERABLE: readonly GermanyStatus[] = ['buy_now', 'quote'];
export const LIGHT_KG = 5;
/** Done, similar work or a clean fit: what the map counts as robots for a job. */
export const isStrong = (fit: Pick<RobotFit, 'verdict'>) => fit.verdict !== 'stretch';

type Robot = Pick<Dossier, 'id' | 'name' | 'robotType' | 'specialisedFor' | 'capabilities' | 'evidence' | 'sources' | 'germany' | 'specs'>;

export function bestEvidence(robot: Pick<Dossier, 'evidence' | 'sources'>, useCaseId: string, related?: (taskId: string) => boolean): BestEvidence | null {
  const entries = robot.evidence.filter((item) => related ? !item.taskIds.includes(useCaseId) && item.taskIds.some(related) : item.taskIds.includes(useCaseId));
  if (!entries.length) return null;
  // Strongest proof first; at the same stage, work in Germany, then the newer, is what a buyer here asks about.
  const german = (item: { where: string | null }) => (/germany|deutschland/i.test(item.where ?? '') ? 1 : 0);
  const best = entries.reduce((a, b) => (STAGE_RANK[b.stage] - STAGE_RANK[a.stage] || german(b) - german(a) || (b.date ?? '').localeCompare(a.date ?? '')) > 0 ? b : a);
  return { stage: best.stage, task: best.task, where: best.where, date: best.date, url: robot.sources.find((source) => source.id === best.sourceId)?.url ?? null };
}

function moveCheck(robot: Robot, needs: UseCaseNeeds): Check {
  const c = robot.capabilities;
  switch (needs.movement) {
    case 'stationary': return 'yes';
    case 'level_floors': return c.levelFloors ? 'yes' : 'no';
    // Rough ground and stairs must be stated: an unproven walker is no option for that job.
    case 'rough_ground': return c.roughGround ? 'yes' : 'no';
    case 'stairs_ladders': return c.stairs ? 'yes' : 'no';
  }
}

function handsCheck(robot: Robot, needs: UseCaseNeeds): Check {
  const { arms, hands } = robot.capabilities;
  if (needs.handWork === 'none') return 'yes';
  if (arms === 0 || hands === 'none') return 'no';
  const grips = hands === 'gripper' || hands === 'dexterous';
  switch (needs.handWork) {
    case 'simple_grip': return grips ? 'yes' : hands === 'optional' ? 'add' : 'no';
    case 'two_arm': return arms < 2 ? 'no' : grips ? 'yes' : hands === 'optional' ? 'add' : 'no';
    case 'dexterous': return hands === 'dexterous' ? 'yes' : hands === 'optional' ? 'add' : 'no';
    // Running a power tool needs fingers on the trigger; even then tool integration and a trial remain.
    case 'tool': return hands === 'dexterous' || hands === 'optional' ? 'add' : 'no';
  }
}

function specValue(robot: Robot, key: string): number | null {
  const spec = robot.specs.find((item) => item.key === key);
  return spec && typeof spec.value === 'number' ? spec.value : null;
}

function loadCheck(robot: Robot, needs: UseCaseNeeds): Check {
  const mass = needs.maxObjectKg;
  if (mass === null) return 'unknown';
  if (mass === 0) return 'yes';
  const c = robot.capabilities;
  if (needs.handWork === 'none') {
    if (c.carryPayloadKg === null) return 'unknown';
    return c.carryPayloadKg >= mass ? 'yes' : 'no';
  }
  const capacity = needs.handWork === 'two_arm'
    ? specValue(robot, 'both_arms_payload_kg') ?? (c.armPayloadKg === null ? null : c.armPayloadKg * Math.min(2, c.arms))
    : c.armPayloadKg;
  // An unpublished payload is an open question for light parts in one hand; heavy parts, two-arm
  // lifts and tool work need a stated payload.
  if (capacity === null) return mass <= LIGHT_KG && (needs.handWork === 'simple_grip' || needs.handWork === 'dexterous') ? 'unknown' : 'no';
  return capacity >= mass ? 'yes' : 'no';
}

function outdoorCheck(robot: Robot, job: JobContext): Check {
  // Outdoor work needs a robot whose maker says it works outdoors.
  return !job.outdoor || robot.capabilities.outdoor ? 'yes' : 'no';
}

const SPECIALISED_CHECKS = { move: 'yes', hands: 'yes', load: 'yes', outdoor: 'yes' } as const;

/** Null when the robot is no option for this job. Evidence for the exact job always keeps a robot in. */
export function fitRobot(robot: Robot, job: JobContext): RobotFit | null {
  const evidence = bestEvidence(robot, job.id);
  const related = evidence || !job.isRelated ? null : bestEvidence(robot, job.id, job.isRelated);
  const status = STATUS_RANK[robot.germany.status];
  // Exact proof first, then proof on related work, then a fit on paper.
  const proof = evidence ? 20 + STAGE_RANK[evidence.stage] * 15 : related ? STAGE_RANK[related.stage] * 10 : 0;
  if (robot.robotType === 'specialised') {
    const forJob = robot.specialisedFor.includes(job.id) || (job.needs?.specialisedJob ? robot.specialisedFor.includes(job.needs.specialisedJob) : false);
    if (!forJob && !evidence) return null;
    return { robotId: robot.id, kind: 'specialised', verdict: evidence ? 'done' : related ? 'similar' : 'fits', evidence, related, checks: { ...SPECIALISED_CHECKS }, score: proof + 20 + status * 2 };
  }
  const needs = job.needs;
  if (!needs) return evidence ? { robotId: robot.id, kind: 'general', verdict: 'done', evidence, related: null, checks: { move: 'unknown', hands: 'unknown', load: 'unknown', outdoor: 'unknown' }, score: proof + status * 2 } : null;
  const checks = { move: moveCheck(robot, needs), hands: handsCheck(robot, needs), load: loadCheck(robot, needs), outdoor: outdoorCheck(robot, job) };
  const blocked = Object.values(checks).includes('no');
  if (!evidence && (blocked || needs.generalPurpose === 'no')) return null;
  const clean = Object.values(checks).every((check) => check === 'yes');
  // A stretch job stays a stretch: offer only robots without open add-ons, unless they have shown related work.
  if (!evidence && !related && needs.generalPurpose === 'stretch' && !clean) return null;
  // Without hand work the job is about moving and sensing, which a spec sheet does not prove: only robots shown on this or similar work.
  if (!evidence && !related && needs.handWork === 'none') return null;
  // Without hand work the capability checks say little: walking past a gauge is not inspecting it.
  const shown = needs.handWork !== 'none' || related !== null;
  const verdict: Verdict = evidence ? 'done' : related && !blocked ? 'similar' : clean && shown && needs.generalPurpose === 'plausible' ? 'fits' : 'stretch';
  // Body type matters for ties: a dog is the natural platform for rounds, not for bench work.
  const affinity = robot.robotType === 'quadruped' ? (needs.handWork === 'none' ? 3 : -3) : 0;
  // A maker's claim that our checks contradict ranks below a clean fit on paper.
  const doubted = evidence?.stage === 'claim' && blocked ? 25 : 0;
  const score = proof + (verdict === 'fits' ? 20 : 0) + status * 2 + affinity + (robot.capabilities.handsIncluded ? 1 : 0) - Object.values(checks).filter((check) => check !== 'yes').length - doubted;
  return { robotId: robot.id, kind: 'general', verdict, evidence, related, checks, score };
}

export type JobOptions = { options: RobotFit[]; preorder: RobotFit[]; notSold: RobotFit[] };

/** Robots for one job, best first. Robots not sold in Germany are kept apart and never offered. */
export function optionsForJob(robots: readonly Robot[], job: JobContext): JobOptions {
  const result: JobOptions = { options: [], preorder: [], notSold: [] };
  for (const robot of robots) {
    const fit = fitRobot(robot, job);
    if (!fit) continue;
    if (ORDERABLE.includes(robot.germany.status)) result.options.push(fit);
    // Robots you cannot order are named only where they would really fit.
    else if (isStrong(fit)) (robot.germany.status === 'preorder' ? result.preorder : result.notSold).push(fit);
  }
  const name = (id: string) => robots.find((robot) => robot.id === id)?.name ?? id;
  for (const list of Object.values(result)) list.sort((a, b) => b.score - a.score || name(a.robotId).localeCompare(name(b.robotId)));
  return result;
}
