import Link from 'next/link';
import type { ReactNode } from 'react';
import frames from '@/data/workflows/frames.json';
import { RobotSection } from '@/components/robot/RobotSection';
import { STATUS_LABELS, priceText, toCard } from '@/lib/market/cards';
import { jobsForRobot, type RobotJob } from '@/lib/market/jobs';
import { loadMarket, type MarketRobot } from '@/lib/market/load';
import { scenePicture, type ScenePicture } from '@/lib/market/use-case-views';
import { photoFit } from '@/components/use-cases/parts';
import { STAGE_LABELS } from '@/lib/market/vocab';
import { plainDashes } from '@/lib/spec/display';
import { ProofTimeline } from './ProofTimeline';
import './market.css';

// Shared pieces of a robot page: how to buy it in Germany, the jobs it fits and where it has worked.

const euro = (amount: number) => '€' + amount.toLocaleString('en-GB', { maximumFractionDigits: 0 });
// The first six job cards show; the rest fold away.
const JOBS_SHOWN = 6;

export function BuyBox({ robot, title, collapsed = false, picture = false }: { robot: MarketRobot; title?: string; collapsed?: boolean; picture?: boolean }) {
  const g = robot.germany;
  const note = plainDashes(g.statusNote + (g.leadTime ? ' Lead time: ' + g.leadTime + '.' : ''));
  const sellers = g.sellers.length ? <ul className="mk-detail-sellers">{g.sellers.map((seller) => <li key={seller.name + seller.country + (seller.productUrl ?? '')}>
    <p><strong>{seller.name}</strong> <span>{seller.country} · {seller.role}</span>{seller.priceEur ? <span className="mk-seller-price"> · {euro(seller.priceEur)}{seller.priceBasis === 'net' ? ' net' : seller.priceBasis === 'gross' ? ' incl. VAT' : ''}</span> : null}</p>
    <p className="mk-seller-links">
      {seller.productUrl ? <a href={seller.productUrl} target="_blank" rel="noopener noreferrer">Product page ↗</a> : null}
      {seller.contactUrl ? <a href={seller.contactUrl} target="_blank" rel="noopener noreferrer">Contact ↗</a> : null}
      {seller.email ? <a href={'mailto:' + seller.email}>{seller.email}</a> : null}
      {seller.phone ? <a href={'tel:' + seller.phone.replace(/[^+\d]/g, '')}>{seller.phone}</a> : null}
    </p>
  </li>)}</ul> : null;
  return <div className="mk-buybox" data-s={g.status} data-version={robot.id}>
    {picture && robot.picture ? <span className="mk-buybox-pic"><img src={robot.picture.src} alt={robot.picture.alt} width={robot.picture.width} height={robot.picture.height} loading="lazy" decoding="async" /></span> : null}
    {title ? <p className="mk-buybox-title">{title}</p> : null}
    <div className="mk-price"><strong>{priceText(toCard(robot))}</strong><span className="mk-status" data-s={g.status}>{STATUS_LABELS[g.status]}</span></div>
    {/* Side by side, a version shows its price and status; how they were read sits with its sellers. */}
    {collapsed
      ? <details className="mk-buybox-sellers"><summary>{g.sellers.length ? 'Where to buy (' + g.sellers.length + ' seller' + (g.sellers.length > 1 ? 's' : '') + ')' : 'How to buy'}</summary>{note ? <p className="mk-buybox-note">{note}</p> : null}{sellers}</details>
      : <>{note ? <p>{note}</p> : null}{sellers}</>}
    <p className="mk-fine">Checked {g.checkedAt}. {robot.officialUrl ? <a href={robot.officialUrl} target="_blank" rel="noopener noreferrer">Maker’s page ↗</a> : null}</p>
  </div>;
}

// A still from each job's step-by-step sheet, the people doing the work by hand today.
const FRAMES = (frames as { frames: Record<string, { src: string; width: number; height: number }[]> }).frames;
// Green for work it has done on a real project, blue for a demo or a near match, amber where it needs more.
const TONE = { done: 'var(--verified)', near: 'var(--assessed)', stretch: 'var(--reported)', claim: 'var(--faint)' } as const;
type JobGroup = { label: string; tone: keyof typeof TONE; jobs: RobotJob[] };

let workPhotos: Map<string, ScenePicture & { robot: string; robotId: string }> | null = null;
/** For a job without a step sheet: a photo of a robot doing it, from the robot with the furthest proof. */
function jobPhoto(jobId: string) {
  if (!workPhotos) {
    workPhotos = new Map();
    const rank = { deployment: 0, pilot: 1, demo: 2, claim: 3 } as const;
    const entries = loadMarket().flatMap((robot) => robot.evidence.flatMap((e) => e.taskIds.map((task) => ({ task, robot, r: rank[e.stage] }))))
      .sort((a, b) => a.r - b.r);
    for (const { task, robot } of entries) {
      if (workPhotos.has(task)) continue;
      const p = scenePicture(robot);
      if (p?.scene) workPhotos.set(task, { ...p, robot: robot.name, robotId: robot.id });
    }
  }
  return workPhotos.get(jobId) ?? null;
}

function JobCard({ job, group, own }: { job: RobotJob; group: JobGroup; own: (ScenePicture & { robotId: string }) | null }) {
  const still = FRAMES[job.id]?.[1] ?? FRAMES[job.id]?.[0];
  const borrowed = still ? null : jobPhoto(job.id);
  const photo = still ? null : borrowed && borrowed.robotId !== own?.robotId ? borrowed : own;
  const frame = still ?? photo;
  const detail = job.fit.evidence ? job.fit.evidence.where ?? job.setting : job.fit.related ? 'Did: ' + job.fit.related.task : job.setting;
  return <li className="flex flex-col overflow-hidden rounded-xl border border-edge/70 bg-card">
    <span className="relative block aspect-[16/9] overflow-hidden bg-subtle">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {frame ? <img src={frame.src} alt="" width={frame.width} height={frame.height} loading="lazy" decoding="async" className={'h-full w-full ' + (photo ? photoFit(photo, 'p-3') + ' bg-white' : 'object-cover')} />
        : <span className="grid h-full place-items-center px-4 text-center text-xs text-faint">{job.setting}</span>}
      <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: TONE[group.tone] }} />{group.label}
      </span>
      {photo && 'robot' in photo ? <span className="absolute bottom-2 right-2 max-w-[80%] truncate rounded bg-card/90 px-1.5 py-0.5 text-[10px] text-muted">Shown: {String(photo.robot)}</span> : null}
    </span>
    <span className="flex flex-col gap-1 p-3">
      <span className="text-sm font-medium leading-snug">{job.title}</span>
      <span className="line-clamp-2 text-xs text-muted">{detail}</span>
    </span>
  </li>;
}

export function RobotJobs({ robotId }: { robotId: string }) {
  const jobs = jobsForRobot(robotId);
  const self = loadMarket().find((robot) => robot.id === robotId);
  const picture = self ? scenePicture(self) : null;
  const own = picture && self ? { ...picture, robotId: self.id } : null;
  // "Has done" used to hold a maker's claim and a year in daily use alike; each proof level is its own group.
  const groups: JobGroup[] = ([
    { label: STAGE_LABELS.deployment, tone: 'done', jobs: jobs.filter((job) => job.fit.verdict === 'done' && job.fit.evidence?.stage === 'deployment') },
    { label: STAGE_LABELS.pilot, tone: 'done', jobs: jobs.filter((job) => job.fit.verdict === 'done' && job.fit.evidence?.stage === 'pilot') },
    { label: STAGE_LABELS.demo, tone: 'near', jobs: jobs.filter((job) => job.fit.verdict === 'done' && job.fit.evidence?.stage === 'demo') },
    { label: STAGE_LABELS.claim, tone: 'claim', jobs: jobs.filter((job) => job.fit.verdict === 'done' && job.fit.evidence?.stage === 'claim') },
    { label: 'Did similar work', tone: 'near', jobs: jobs.filter((job) => job.fit.verdict === 'similar') },
    { label: 'Specs fit', tone: 'near', jobs: jobs.filter((job) => job.fit.verdict === 'fits') },
    { label: 'Needs add-ons or a trial', tone: 'stretch', jobs: jobs.filter((job) => job.fit.verdict === 'stretch') },
  ] satisfies JobGroup[]).filter((group) => group.jobs.length);
  if (!jobs.length) return <p className="mk-muted">No job on the map fits this robot yet.</p>;
  const cards = groups.flatMap((group) => group.jobs.map((job) => ({ job, group })));
  const card = ({ job, group }: (typeof cards)[number]) => <JobCard key={job.id} job={job} group={group} own={own} />;
  return <div className="flex flex-col gap-4">
    <ul className="flex flex-wrap gap-2" aria-label="Jobs by how well it fits">
      {groups.map((group) => <li key={group.label} className="inline-flex items-center gap-2 rounded-full border border-edge px-3 py-1.5 text-xs">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: TONE[group.tone] }} />{group.label}<span className="num font-semibold">{group.jobs.length}</span>
      </li>)}
    </ul>
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.slice(0, JOBS_SHOWN).map(card)}</ul>
    {cards.length > JOBS_SHOWN ? <details className="group/jobs">
      <summary className="inline-flex cursor-pointer list-none items-center rounded-full border border-edge px-4 py-2 text-sm font-medium transition hover:border-edge-strong [&::-webkit-details-marker]:hidden">
        <span className="group-open/jobs:hidden">Show {cards.length - JOBS_SHOWN} more jobs</span><span className="hidden group-open/jobs:inline">Show fewer</span>
      </summary>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.slice(JOBS_SHOWN).map(card)}</ul>
    </details> : null}
  </div>;
}

/** Where the robot has worked, across all its versions, each with its source. */
export function RobotEvidence({ robots }: { robots: MarketRobot[] }) {
  const seen = new Set<string>();
  const items = robots.flatMap((robot) => robot.evidence.map((item) => ({ item, source: robot.sources.find((source) => source.id === item.sourceId) })))
    .filter(({ item }) => { const key = item.task + '|' + (item.where ?? ''); if (seen.has(key)) return false; seen.add(key); return true; });
  if (!items.length) return null;
  return <><ProofTimeline items={items.map(({ item }) => item)} /><ul className="mk-evidence">{items.map(({ item, source }, index) => <li key={index}>
    <span className="mk-verdict" data-v={item.stage === 'claim' ? 'stretch' : item.stage === 'demo' ? 'fits' : 'done'}>{STAGE_LABELS[item.stage]}</span>
    <p><strong>{item.task}</strong>{item.where ? ' · ' + item.where : ''}{item.date ? ' · ' + item.date : ''}</p>
    {item.note ? <p className="mk-muted">{item.note}</p> : null}
    {source ? <a className="mk-fine" href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher} ↗</a> : null}
  </li>)}</ul></>;
}

const RANK = { buy_now: 0, quote: 1, preorder: 2, not_sold: 3 } as const;
// The version a German buyer can get most easily first.
const byAccess = (robots: MarketRobot[]) => [...robots].sort((a, b) => RANK[a.germany.status] - RANK[b.germany.status] || a.name.localeCompare(b.name));

/** Every version a German buyer can choose, each with its own picture and name when there are several,
 * or when the page has no picture of its own. Without a German record, `fallback` says what is known. */
export function GermanySection({ robots, pictures = false, fallback }: { robots: MarketRobot[]; pictures?: boolean; fallback?: ReactNode }) {
  const versions = byAccess(robots);
  const several = versions.length > 1;
  const named = several || pictures;
  const checked = versions.map((robot) => robot.germany.checkedAt).sort().at(-1);
  return <RobotSection id="germany" title="Buy in Germany" className="mk-germany" empty="No German seller recorded yet."
    aside={versions.length ? <span className="num text-xs text-faint">{several ? versions.length + ' versions · ' : ''}checked {checked}</span> : null}>
    {versions.length ? <div className="mk-germany-body">
      <p>Sellers, prices and stock as their pages showed them. No enquiry is sent from this site.</p>
      <div className="mk-versions" data-count={versions.length}>{versions.map((robot) => <BuyBox key={robot.id} robot={robot} collapsed={several} picture={named} title={named ? robot.name + (robot.variant ? ' · ' + robot.variant : '') : undefined} />)}</div>
    </div> : fallback}
  </RobotSection>;
}

/** The jobs on the map the robot fits, for the version a German buyer can get most easily. Only market
 * records are placed on the map, so a robot without one has not been checked against its jobs. */
export function JobsSection({ robots }: { robots: MarketRobot[] }) {
  const primary = byAccess(robots)[0];
  return <RobotSection id="jobs" title="Jobs" className="mk-germany" empty="No jobs are linked to this robot yet."
    aside={<span className="flex flex-wrap items-center gap-x-3 text-xs">{robots.length > 1 ? <span className="text-faint">For the {primary.name}</span> : null}</span>}>
    {primary ? <div className="mk-germany-body"><RobotJobs robotId={primary.id} /></div> : undefined}
  </RobotSection>;
}

export type Deployment = { site?: string; year?: number; note?: string };

/** Where the robot has worked, across its versions, each with its source. Catalogue deployment notes
 * stand in only where no market record has evidence, so one job is not listed twice. */
export function TrackRecordSection({ robots, deployments = [] }: { robots: MarketRobot[]; deployments?: Deployment[] }) {
  const evidence = robots.some((robot) => robot.evidence.length);
  return <RobotSection id="track-record" title="Where it has worked" className="mk-germany" empty="No real-world work recorded yet.">
    {evidence ? <div className="mk-germany-body"><RobotEvidence robots={byAccess(robots)} /></div>
      : deployments.length ? <ul className="mk-germany-body mk-evidence">{deployments.map((item, index) => <li key={index}><p><strong>{item.site ?? 'Site not named'}</strong>{item.year ? ' · ' + item.year : ''}</p>{item.note ? <p className="mk-muted">{plainDashes(item.note)}</p> : null}</li>)}</ul>
        : undefined}
  </RobotSection>;
}
