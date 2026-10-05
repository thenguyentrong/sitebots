import Link from 'next/link';
import type { Answer, AnswerJob } from '@/lib/market/answer';
import { STATUS_LABELS } from '@/lib/market/cards';
import { ORDERABLE } from '@/lib/market/match';
import { PROOF_HELP, PROOF_LABELS, STAGE_LABELS, type ProofLevel } from '@/lib/market/vocab';
import '@/components/market/market.css';

// The landing's answer, before the map: how many construction-site jobs robots do today, which ones,
// with which robot, and whether you can buy that robot in Germany. Counted from named projects in
// the sources, so a robot that only fits a job on paper never counts as doing it.

const LEVELS: ProofLevel[] = ['deployment', 'pilot', 'demo', 'claim', 'none'];
const year = (date: string | null) => date?.slice(0, 4) ?? null;
const plural = (count: number, word: string) => count + ' ' + word + (count === 1 ? '' : 's');
const names = (list: string[]) => list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list.at(-1) : list[0] ?? '';
// A job title inside a sentence: "Grind hardened concrete" reads "grind hardened concrete"; "HV bolts" stays.
const inSentence = (title: string) => /^[A-Z][a-z]/.test(title) ? title.charAt(0).toLowerCase() + title.slice(1) : title;

function Row({ job }: { job: AnswerJob }) {
  const { best, buy } = job;
  const sold = ORDERABLE.includes(best.status);
  return <li className="today-row" data-level={job.level}>
    <span className="today-dot" data-level={job.level} data-abroad={sold ? undefined : ''} aria-hidden="true" />
    <div className="today-row-main">
      <p className="today-row-title"><Link href={job.href}>{job.title}</Link> <small>{job.setting}</small></p>
      <p className="today-row-proof">
        <Link href={best.href}>{best.name}</Link>{best.where ? ' · ' + best.where : ''}{year(best.date) ? ', ' + year(best.date) : ''}
        {best.url ? <> · <a href={best.url} target="_blank" rel="noopener noreferrer">source ↗</a></> : null}
      </p>
      {!sold && buy ? <p className="today-row-here">Sold in Germany: <Link href={buy.href}>{buy.name}</Link> · {STAGE_LABELS[buy.stage].toLowerCase()}</p> : null}
    </div>
    <p className="today-row-buy">
      <span className="mk-status" data-s={best.status}>{STATUS_LABELS[best.status]}</span>
      {sold ? <small>{best.price}</small> : null}
    </p>
  </li>;
}

/** A proven job as a picture: the robot that did it (at work, where a photo shows it), the project and
 *  what it costs here. The photo is the maker's, credited on it. */
function Card({ job }: { job: AnswerJob }) {
  const { best } = job;
  const photo = best.photo;
  const sold = ORDERABLE.includes(best.status);
  return <li className="today-card" data-level={job.level}>
    <Link href={job.href} className="today-card-photo" data-in-use={photo?.inUse ? '' : undefined} tabIndex={-1} aria-hidden="true">
      {photo ? <img src={photo.src} alt="" width={photo.width} height={photo.height} loading="lazy" decoding="async" /> : null}
      {photo?.inUse ? <span className="today-card-tag">At work</span> : null}
      {photo ? <span className="today-card-credit">{photo.credit}</span> : null}
    </Link>
    <div className="today-card-body">
      <p className="today-card-kicker"><span className="today-dot" data-level={job.level} data-abroad={sold ? undefined : ''} aria-hidden="true" />{PROOF_LABELS[job.level]} · {job.setting}</p>
      <h4><Link href={job.href}>{job.title}</Link></h4>
      <p className="today-card-robot"><Link href={best.href}>{best.name}</Link></p>
      <p className="today-card-where">{best.where}{year(best.date) ? ', ' + year(best.date) : ''}{best.url ? <> · <a href={best.url} target="_blank" rel="noopener noreferrer">source ↗</a></> : null}</p>
      <p className="today-card-buy"><span className="mk-status" data-s={best.status}>{STATUS_LABELS[best.status]}</span>{sold ? <strong>{best.price}</strong> : null}</p>
      {photo ? <p className="today-card-credit-text" aria-hidden="true">Photo: {photo.credit}</p> : null}
    </div>
  </li>;
}

function General({ general }: { general: Answer['general'] }) {
  const { deployment, pilot } = general.levels;
  const who = names(general.robots);
  const text = deployment
    ? `They are in daily use on ${plural(deployment, 'construction-site job')}${pilot ? ' and tested in pilots on ' + pilot + ' more' : ''} (${who}).`
    : pilot ? `None of them is in daily use on a construction site yet. ${who} ${general.robots.length > 1 ? 'have' : 'has'} been tested in pilots on ${plural(pilot, 'job')}.`
      : 'None of them has been proven on a construction-site job yet.';
  return <p className="today-general"><strong>Humanoids, robot dogs and mobile manipulators.</strong> {general.sold} are sold in Germany. {text} <Link href="/robots">See them all</Link></p>;
}

export function TodayAnswer({ answer, total }: { answer: Answer; total: number }) {
  const { checked, levels, proven, shown } = answer;
  // Daily use with a robot a buyer here can get first; daily use only with robots not sold here folds
  // into one line, so a phone reaches the map without scrolling past every case.
  const inUse = proven.filter((job) => job.level === 'deployment');
  const here = inUse.filter((job) => job.buy?.stage === 'deployment');
  const abroad = inUse.filter((job) => job.buy?.stage !== 'deployment');
  const piloted = proven.filter((job) => job.level === 'pilot');
  return <section id="today" className="home-today" aria-labelledby="today-title">
    <p className="jp-kicker">The answer today</p>
    <h2 id="today-title">Robots are in daily use on {levels.deployment} of {checked} construction-site jobs</h2>
    <p className="home-section-lede">
      {levels.pilot ? plural(levels.pilot, 'more job') + (levels.pilot === 1 ? ' was' : ' were') + ' tried on real sites. ' : ''}
      Proof means a named project in a source, not a brochure. Most jobs have none yet.
    </p>

    <div className="today-bar" aria-hidden="true">{LEVELS.filter((level) => levels[level]).map((level) => <span key={level} data-level={level} style={{ flexGrow: levels[level] }} />)}</div>
    <ul className="today-key" aria-label={'The ' + checked + ' construction-site jobs by their best proof'}>
      {LEVELS.map((level) => <li key={level}>
        <span className="today-dot" data-level={level} aria-hidden="true" />
        <span><strong>{levels[level]}</strong> {PROOF_LABELS[level]}</span>
        <small>{PROOF_HELP[level]}</small>
      </li>)}
    </ul>

    {here.length ? <div className="today-group" data-testid="today-in-use">
      <h3>{PROOF_LABELS.deployment}, with a robot you can buy in Germany <span>{plural(here.length, 'job')}</span></h3>
      <ol className="today-cards">{here.map((job) => <Card key={job.id} job={job} />)}</ol>
    </div> : null}
    {abroad.length ? <div className="today-abroad">
      <p><span className="today-dot" data-level="deployment" data-abroad="" aria-hidden="true" /><span><strong>Also {PROOF_LABELS.deployment.toLowerCase()}, with robots not sold in Germany:</strong> {abroad.map((job, index) => <span key={job.id}>{index ? '; ' : ''}<Link href={job.href}>{inSentence(job.title)}</Link></span>)}.</span></p>
      <details className="today-more"><summary>Where, and by which robot</summary><ol className="today-rows">{abroad.map((job) => <Row key={job.id} job={job} />)}</ol></details>
    </div> : null}
    {piloted.length ? <div className="today-group">
      <h3>{PROOF_LABELS.pilot} <span>{plural(piloted.length, 'job')}</span></h3>
      <ol className="today-cards">{piloted.map((job) => <Card key={job.id} job={job} />)}</ol>
    </div> : null}

    {shown.length ? <details className="today-more">
      <summary>{plural(shown.length, 'more job')} with only a demo or the maker’s word</summary>
      <ol className="today-rows">{shown.map((job) => <Row key={job.id} job={job} />)}</ol>
    </details> : null}

    <General general={answer.general} />
    <p className="today-next"><a href="#explore">Find your job among all {total} on the map ↓</a><Link href="/use-cases/criteria">How proof is judged</Link></p>
  </section>;
}
