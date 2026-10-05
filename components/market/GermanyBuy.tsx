import Link from 'next/link';
import { STATUS_LABELS, priceText, toCard } from '@/lib/market/cards';
import { jobsForRobot, type RobotJob } from '@/lib/market/jobs';
import type { MarketRobot } from '@/lib/market/load';
import { STAGE_LABELS } from '@/lib/market/vocab';
import { ProofTimeline } from './ProofTimeline';
import './market.css';

// Shared pieces of a robot page: how to buy it in Germany, the jobs it fits and where it has worked.

const euro = (amount: number) => '€' + amount.toLocaleString('en-GB', { maximumFractionDigits: 0 });
// Each list of jobs shows its first five; the rest fold away.
const JOBS_SHOWN = 5;

export function BuyBox({ robot, title, collapsed = false, picture = false }: { robot: MarketRobot; title?: string; collapsed?: boolean; picture?: boolean }) {
  const g = robot.germany;
  const note = g.statusNote + (g.leadTime ? ' Lead time: ' + g.leadTime + '.' : '');
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
      ? <details className="mk-buybox-sellers"><summary>{g.sellers.length ? 'Where to buy · ' + g.sellers.length + ' seller' + (g.sellers.length > 1 ? 's' : '') : 'How to buy'}</summary>{note ? <p className="mk-buybox-note">{note}</p> : null}{sellers}</details>
      : <>{note ? <p>{note}</p> : null}{sellers}</>}
    <p className="mk-fine">Checked {g.checkedAt}. {robot.officialUrl ? <a href={robot.officialUrl} target="_blank" rel="noopener noreferrer">Maker’s page ↗</a> : null}</p>
  </div>;
}

function JobLinks({ jobs }: { jobs: RobotJob[] }) {
  return <ul>{jobs.map((job) => <li key={job.id}><Link href={'/?usecase=' + encodeURIComponent(job.id) + '#explore'}>{job.title}</Link>{job.fit.evidence ? <small>{STAGE_LABELS[job.fit.evidence.stage]}{job.fit.evidence.where ? ' · ' + job.fit.evidence.where : ''}</small> : job.fit.related ? <small>Did similar work · {job.fit.related.task}</small> : <small>{job.setting}</small>}</li>)}</ul>;
}

export function RobotJobs({ robotId }: { robotId: string }) {
  const jobs = jobsForRobot(robotId);
  // "Has done" used to hold a maker's claim and a year in daily use alike; each proof level is its own group.
  const groups: [string, RobotJob[]][] = [
    ...(['deployment', 'pilot', 'demo', 'claim'] as const).map((stage): [string, RobotJob[]] => [STAGE_LABELS[stage], jobs.filter((job) => job.fit.verdict === 'done' && job.fit.evidence?.stage === stage)]),
    ['Did similar work', jobs.filter((job) => job.fit.verdict === 'similar')],
    ['Fits on paper', jobs.filter((job) => job.fit.verdict === 'fits')],
    ['Needs add-ons or a trial', jobs.filter((job) => job.fit.verdict === 'stretch')],
  ];
  if (!jobs.length) return <p className="mk-muted">No job on the map fits this robot yet.</p>;
  return <div className="mk-job-columns">{groups.filter(([, list]) => list.length).map(([label, list]) => <div key={label}>
    <h3>{label} <span>{list.length}</span></h3>
    <JobLinks jobs={list.slice(0, JOBS_SHOWN)} />
    {list.length > JOBS_SHOWN ? <details className="mk-siblings"><summary>Show {list.length - JOBS_SHOWN} more</summary><JobLinks jobs={list.slice(JOBS_SHOWN)} /></details> : null}
  </div>)}</div>;
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

/** On a catalogue robot page: every version a German buyer can choose, each with its own picture and
 * name when there are several, or when the page has no picture of its own. */
export function GermanySection({ robots, pictures = false }: { robots: MarketRobot[]; pictures?: boolean }) {
  if (!robots.length) return null;
  const versions = byAccess(robots);
  const several = versions.length > 1;
  const named = several || pictures;
  const checked = versions.map((robot) => robot.germany.checkedAt).sort().at(-1);
  return <section id="germany" className="card mt-6 overflow-hidden mk-germany" aria-labelledby="germany-title">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
      <h2 id="germany-title" className="text-sm font-semibold">Buy in Germany</h2>
      <span className="num text-xs text-faint">{several ? versions.length + ' versions · ' : ''}checked {checked}</span>
    </header>
    <div className="mk-germany-body">
      <p>Sellers, prices and stock as their pages showed them. No enquiry is sent from this site.</p>
      <div className="mk-versions" data-count={versions.length}>{versions.map((robot) => <BuyBox key={robot.id} robot={robot} collapsed={several} picture={named} title={named ? robot.name + (robot.variant ? ' · ' + robot.variant : '') : undefined} />)}</div>
    </div>
  </section>;
}

/** The jobs on the map the robot fits, for the version a German buyer can get most easily. */
export function JobsSection({ robots }: { robots: MarketRobot[] }) {
  if (!robots.length) return null;
  const primary = byAccess(robots)[0];
  return <section id="jobs" className="card overflow-hidden mk-germany" aria-labelledby="jobs-title">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
      <h2 id="jobs-title" className="text-sm font-semibold">Jobs on the map{robots.length > 1 ? <span className="font-normal text-faint"> · for the {primary.name}</span> : null}</h2>
      <Link href="/#explore" className="text-xs text-muted underline underline-offset-2 hover:text-foreground">Open the job map</Link>
    </header>
    <div className="mk-germany-body"><RobotJobs robotId={primary.id} /></div>
  </section>;
}

/** Where the robot has worked, across its versions, each with its source. */
export function TrackRecordSection({ robots }: { robots: MarketRobot[] }) {
  if (!robots.some((robot) => robot.evidence.length)) return null;
  return <section id="track-record" className="card overflow-hidden mk-germany" aria-labelledby="track-title">
    <header className="border-b border-edge/70 px-5 py-3.5"><h2 id="track-title" className="text-sm font-semibold">Where it has worked</h2></header>
    <div className="mk-germany-body"><RobotEvidence robots={byAccess(robots)} /></div>
  </section>;
}
