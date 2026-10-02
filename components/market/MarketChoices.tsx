'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RobotGlyph } from '@/components/robot/RobotGlyph';
import { STATUS_LABELS, TYPE_LABELS, TYPE_PLURAL, priceText, type RobotCardData } from '@/lib/market/cards';
import type { JobDetail, JobPoint } from '@/lib/market/jobs';
import { isStrong, type Check, type RobotFit } from '@/lib/market/match';
import type { RobotType } from '@/lib/market/schema';
import { STAGE_LABELS } from '@/lib/market/vocab';
import type { FormFactor } from '@/lib/spec/enums';

const GLYPH: Record<RobotType, FormFactor> = { humanoid: 'humanoid', quadruped: 'quadruped', mobile_manipulator: 'mobile_manipulator', specialised: 'dedicated_robot' };
const CHECK_MARK: Record<Check, string> = { yes: '✓', add: '+', unknown: '?', no: '×' };
const CHECK_WORD: Record<Check, string> = { yes: 'fits', add: 'needs an add-on', unknown: 'not published', no: 'does not fit' };
const CHECKS = [['move', 'Moves'], ['hands', 'Hands'], ['load', 'Load'], ['outdoor', 'Outdoors']] as const;
const TYPES: RobotType[] = ['humanoid', 'quadruped', 'mobile_manipulator', 'specialised'];

function verdictText(fit: RobotFit, job: JobPoint): string {
  if (fit.verdict === 'done' && fit.evidence) return STAGE_LABELS[fit.evidence.stage] + (fit.evidence.where ? ' · ' + fit.evidence.where : '') + (fit.evidence.date ? ', ' + fit.evidence.date.slice(0, 4) : '');
  if (fit.verdict === 'similar' && fit.related) return 'Did similar work · ' + fit.related.task + (fit.related.where ? ', ' + fit.related.where : '');
  if (fit.kind === 'specialised') return 'Built for this kind of job';
  if (fit.verdict === 'fits') return 'Fits what this job needs';
  const open: string[] = [];
  if (fit.checks.hands === 'add') open.push(job.needs?.handWork === 'tool' ? 'a tool fitted' : 'hands added');
  if (fit.checks.load === 'unknown') open.push('payload confirmed');
  if (fit.checks.move === 'unknown') open.push(job.needs?.movement === 'stairs_ladders' ? 'stairs confirmed' : 'rough ground confirmed');
  if (fit.checks.outdoor === 'unknown') open.push('outdoor use confirmed');
  return open.length ? 'Needs ' + open.join(', ') : 'Possible, needs a trial';
}

function Picture({ robot, className }: { robot: RobotCardData; className?: string }) {
  const [failed, setFailed] = useState(false);
  return robot.picture && !failed
    ? <img className={className} src={robot.picture.src} alt={robot.picture.alt} width={robot.picture.width} height={robot.picture.height} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    : <RobotGlyph formFactor={GLYPH[robot.robotType]} className={(className ?? '') + ' mk-glyph'} />;
}

function Sellers({ robot }: { robot: RobotCardData }) {
  const sellers = robot.germany.sellers;
  return <div className="mk-sellers" data-testid="sellers">
    {sellers.length ? sellers.map((seller) => <div key={seller.name + seller.country + (seller.productUrl ?? '')} className="mk-seller">
      <p><strong>{seller.name}</strong> <span>{seller.country} · {seller.role}</span></p>
      {seller.priceEur ? <p className="mk-seller-price">€{seller.priceEur.toLocaleString('en-GB', { maximumFractionDigits: 0 })}{seller.priceBasis === 'net' ? ' net' : seller.priceBasis === 'gross' ? ' incl. VAT' : ''}</p> : null}
      <p className="mk-seller-links">
        {seller.productUrl ? <a href={seller.productUrl} target="_blank" rel="noopener noreferrer">Product page ↗</a> : null}
        {seller.contactUrl ? <a href={seller.contactUrl} target="_blank" rel="noopener noreferrer">Contact ↗</a> : null}
        {seller.email ? <a href={'mailto:' + seller.email}>{seller.email}</a> : null}
        {seller.phone ? <a href={'tel:' + seller.phone.replace(/[^+\d]/g, '')}>{seller.phone}</a> : null}
      </p>
    </div>) : <p className="mk-muted">No seller listed yet. {robot.officialUrl ? <a href={robot.officialUrl} target="_blank" rel="noopener noreferrer">Ask the maker ↗</a> : null}</p>}
    <p className="mk-fine">Checked {robot.germany.checkedAt}. No enquiry is sent from this site.</p>
  </div>;
}

type Entry = { fit: RobotFit; siblings: RobotFit[] };
/** Job-specific machines from one maker show as one card, with their other sizes listed under it. */
function group(fits: RobotFit[], robots: Record<string, RobotCardData>): Entry[] {
  const entries: Entry[] = [];
  const byMaker = new Map<string, Entry>();
  for (const fit of fits) {
    const robot = robots[fit.robotId];
    if (robot.robotType !== 'specialised') { entries.push({ fit, siblings: [] }); continue; }
    const key = robot.maker + '|' + robot.jobKey;
    const entry = byMaker.get(key);
    if (entry) entry.siblings.push(fit);
    else { const created = { fit, siblings: [] }; byMaker.set(key, created); entries.push(created); }
  }
  return entries;
}

function Card({ robot, fit, siblings, robots, job, first, compared, full, onCompare }: { robot: RobotCardData; fit: RobotFit; siblings: RobotFit[]; robots: Record<string, RobotCardData>; job: JobPoint; first: boolean; compared: boolean; full: boolean; onCompare: () => void }) {
  const [buy, setBuy] = useState(false);
  const specs = robot.specs.filter((spec) => spec.key !== 'ip_rating').slice(0, 3);
  return <article className="mk-robot" data-robot={robot.id} data-verdict={fit.verdict} data-type={robot.robotType}>
    <div className="mk-robot-pic">
      {first && (fit.verdict === 'done' || fit.verdict === 'similar' || fit.verdict === 'fits') ? <span className="mk-best">Best match</span> : null}
      <Picture robot={robot} className="mk-robot-img" />
      <label className="mk-compare" title={full && !compared ? 'Compare up to four robots' : 'Add to comparison'}>
        <input type="checkbox" checked={compared} disabled={full && !compared} onChange={onCompare} aria-label={'Compare ' + robot.name} /><span>Compare</span>
      </label>
    </div>
    <div className="mk-robot-body">
      <p className="mk-maker">{TYPE_LABELS[robot.robotType]} · {robot.body}</p>
      <h4>{robot.name}</h4>
      <p className="mk-verdict" data-v={fit.verdict}>{verdictText(fit, job)}{(fit.evidence ?? fit.related)?.url ? <> · <a href={(fit.evidence ?? fit.related)!.url!} target="_blank" rel="noopener noreferrer">source ↗</a></> : null}</p>
      {fit.kind === 'general' ? <ul className="mk-checks" aria-label="How it fits">
        {CHECKS.filter(([key]) => key !== 'outdoor' || job.outdoor).map(([key, label]) => <li key={key} data-c={fit.checks[key]} title={label + ': ' + CHECK_WORD[fit.checks[key]]}><span aria-hidden="true">{CHECK_MARK[fit.checks[key]]}</span>{label}</li>)}
      </ul> : null}
      <dl className="mk-specs">{specs.map((spec) => <div key={spec.key}><dt>{spec.label}</dt><dd title={spec.conditions ?? undefined}>{spec.value}</dd></div>)}</dl>
      <div className="mk-price">
        <strong>{priceText(robot)}</strong>
        <span className="mk-status" data-s={robot.germany.status}>{STATUS_LABELS[robot.germany.status]}</span>
      </div>
      <div className="mk-actions">
        <button type="button" aria-expanded={buy} onClick={() => setBuy(!buy)}>{buy ? 'Hide sellers' : 'Where to buy'}{robot.germany.sellers.length ? ' (' + robot.germany.sellers.length + ')' : ''}</button>
        <Link href={robot.href}>Details</Link>
      </div>
      {buy ? <Sellers robot={robot} /> : null}
      {siblings.length ? <details className="mk-siblings"><summary>{siblings.length} more size{siblings.length > 1 ? 's' : ''} from {robot.maker}</summary><ul>{siblings.map((sibling) => <li key={sibling.robotId}><Link href={robots[sibling.robotId].href}>{robots[sibling.robotId].name}</Link><span>{priceText(robots[sibling.robotId])}</span></li>)}</ul></details> : null}
    </div>
  </article>;
}

function Comparison({ items, job }: { items: { robot: RobotCardData; fit: RobotFit }[]; job: JobPoint }) {
  const rows: [string, (robot: RobotCardData, fit: RobotFit) => string][] = [
    ['For this job', (_robot, fit) => verdictText(fit, job)],
    ['Price in Germany', (robot) => priceText(robot)],
    ['How to get it', (robot) => STATUS_LABELS[robot.germany.status] + (robot.germany.sellers.length ? ' · ' + robot.germany.sellers.length + ' seller' + (robot.germany.sellers.length > 1 ? 's' : '') : '')],
    ['Body', (robot) => TYPE_LABELS[robot.robotType] + ', ' + robot.body.toLowerCase()],
    ['Hands', (robot) => robot.arms ? robot.arms + ' arm' + (robot.arms > 1 ? 's' : '') + ', ' + ({ none: 'no hands', gripper: 'grippers', dexterous: 'finger hands', tool: 'tool', optional: 'hands optional' } as Record<string, string>)[robot.hands] : 'No arm'],
    ['Payload per arm', (robot) => robot.armPayloadKg === null ? '—' : robot.armPayloadKg + ' kg'],
    ['Carries on body', (robot) => robot.carryPayloadKg === null ? '—' : robot.carryPayloadKg + ' kg'],
    ['Runtime', (robot) => robot.runtimeH === null ? '—' : robot.runtimeH + ' h'],
    ['Stairs', (robot) => robot.stairs === null ? '—' : robot.stairs ? 'Yes' : 'No'],
    ['Outdoors', (robot) => robot.outdoor === null ? '—' : robot.outdoor ? 'Yes' : 'No'],
    ['Protection', (robot) => robot.ipRating ?? '—'],
  ];
  return <section className="mk-compare-table" aria-label="Robot comparison" data-testid="robot-comparison">
    <h3>Side by side</h3>
    <div className="mk-table-scroll" tabIndex={0}>
      <table>
        <thead><tr><th scope="col"><span className="sr-only">Measure</span></th>{items.map(({ robot }) => <th scope="col" key={robot.id}><Picture robot={robot} className="mk-table-img" /><span>{robot.name}</span></th>)}</tr></thead>
        <tbody>{rows.map(([label, read]) => <tr key={label}><th scope="row">{label}</th>{items.map(({ robot, fit }) => <td key={robot.id}>{read(robot, fit)}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <p className="mk-fine">— means the maker does not publish it. Values are for the configuration on the details page.</p>
  </section>;
}

export function MarketChoices({ job, type: initialType, contact }: { job: JobDetail; type: '' | RobotType; contact?: string }) {
  const robots: Record<string, RobotCardData> = Object.fromEntries(job.robots.map((robot) => [robot.id, robot]));
  const [type, setType] = useState<'' | RobotType>(initialType);
  const [compare, setCompare] = useState<string[]>([]);
  const [more, setMore] = useState(false);
  const [limit, setLimit] = useState(12);
  const all = job.fits.options.filter((fit) => robots[fit.robotId]);
  const ofType = all.filter((fit) => !type || robots[fit.robotId].robotType === type);
  const strong = ofType.filter(isStrong), weak = ofType.filter((fit) => !isStrong(fit));
  // Robots that only work with add-ons or a trial stay behind a switch unless nothing else fits.
  const shown = strong.length && !more ? strong : ofType;
  const entries = group(shown, robots);
  const pool = all.some(isStrong) ? all.filter(isStrong) : all;
  const counts = Object.fromEntries(TYPES.map((robotType) => [robotType, pool.filter((fit) => robots[fit.robotId].robotType === robotType).length]));
  const compared = all.filter((fit) => compare.includes(fit.robotId)).map((fit) => ({ robot: robots[fit.robotId], fit }));
  const toggle = (id: string) => setCompare((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 4 ? [...current, id] : current);
  const later = job.fits.preorder.filter((fit) => robots[fit.robotId]);
  const fitting = all.filter(isStrong);
  const makers = new Set(fitting.map((fit) => robots[fit.robotId].maker)).size;

  return <section className="mk-choices" aria-label="Robots for this job" data-testid="robot-choices">
    <div className="mk-choices-head">
      <h3>{fitting.length ? fitting.length + ' robot' + (fitting.length > 1 ? 's' : '') + (makers > 1 && makers < fitting.length ? ' from ' + makers + ' makers' : '') + ' you can buy in Germany fit this job' : all.length ? 'No robot fits outright; ' + all.length + ' could with add-ons or a trial' : 'No robot you can buy in Germany yet'}</h3>
      {all.length ? <div className="mk-chips" role="group" aria-label="Robot type">
        <button type="button" aria-pressed={!type} onClick={() => setType('')}>All {pool.length}</button>
        {TYPES.filter((robotType) => counts[robotType]).map((robotType) => <button type="button" key={robotType} aria-pressed={type === robotType} onClick={() => setType(robotType)}>{TYPE_PLURAL[robotType]} {counts[robotType]}</button>)}
      </div> : null}
    </div>
    {all.length ? <>
      <p className="mk-muted">Best match first: robots that have done this job, then robots that did similar work, then robots that fit on paper, then robots that need add-ons. {compare.length ? compare.length + ' selected to compare.' : 'Tick up to four to compare.'}</p>
      <div className="mk-grid" data-testid="robot-grid">{entries.slice(0, limit).map(({ fit, siblings }, index, visible) => <Card key={fit.robotId} robot={robots[fit.robotId]} fit={fit} siblings={siblings} robots={robots} job={job} first={index === 0 && !type && (visible.length === 1 || visible[1].fit.score < fit.score)} compared={compare.includes(fit.robotId)} full={compare.length >= 4} onCompare={() => toggle(fit.robotId)} />)}</div>
      {entries.length > limit ? <button type="button" className="mk-more-options" onClick={() => setLimit(limit + 12)}>Show {Math.min(12, entries.length - limit)} more of {entries.length - limit}</button> : null}
      {strong.length && weak.length ? <button type="button" className="mk-more-options" aria-expanded={more} onClick={() => setMore(!more)}>{more ? 'Show only robots that fit' : weak.length + ' more robot' + (weak.length > 1 ? 's' : '') + ' could work with add-ons or a trial'}</button> : null}
      {!shown.length ? <p className="mk-muted">None of this type. <button type="button" className="mk-link-button" onClick={() => setType('')}>Show all</button></p> : null}
      {compared.length >= 2 ? <Comparison items={compared} job={job} /> : null}
    </> : <p className="mk-muted">{job.needs?.generalPurpose === 'no' ? 'This job needs a dedicated machine or stays with people today.' : 'No robot sold in Germany matches what this job needs yet.'} {job.needs?.reason ?? ''}</p>}
    {contact ? <p className="mk-talk">Not sure which robot fits your site? <a href={'mailto:' + contact + '?subject=' + encodeURIComponent('Robots for: ' + job.title)}>Write to us</a> and we put you in touch with a seller or integrator.</p> : null}
    {later.length ? <div className="mk-elsewhere">
      <p><strong>Pre-order only:</strong> {later.map((fit, index) => <span key={fit.robotId}>{index ? ', ' : ''}<Link href={robots[fit.robotId].href}>{robots[fit.robotId].name}</Link></span>)}</p>
    </div> : null}
  </section>;
}
