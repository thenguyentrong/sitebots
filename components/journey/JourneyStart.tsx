import Image from 'next/image';
import Link from 'next/link';
import type { SettingGroup, Verdict } from '@/lib/content/vocab';
import { GROUP_LABELS, TEST_QUESTIONS, TEST_SHORT, VERDICT_LABELS } from '@/lib/journey/labels';
import { STATIONS } from '@/lib/journey/stations';
import { ui } from '@/lib/ui';
import { Icon } from './Icon';
import { HARD_RULES } from './TestStrip';

export type LimitCard = { id: string; label: string; figure: string; value: string; basis: string };
export type GroupTeaser = { group: SettingGroup; count: number; settings: number; verdicts: Record<Verdict, number>; examples: { title: string; href: string; verdict: Verdict }[] };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
/** "under load, against an 8-hour shift" -> "Under load, against an 8-hour shift." */
const sentence = (text: string) => { const t = text.trim().replace(/^[,;:]\s*/, ''); return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.'); };
const BASIS: Record<string, string> = { catalogue_stats: 'From the catalogue', source: 'Sourced', analyst: 'Sitebots assessment' };

/** The robots in the landing image, left to right, each linked to its page. */
const LINEUP = [
  { name: 'Unitree H2', href: '/robots/unitree/h2' },
  { name: 'Unitree G1', href: '/robots/unitree/g1' },
  { name: 'Rainbow Robotics RB-Y1', href: '/robots/rainbow/rb-y1' },
  { name: 'Boston Dynamics Spot', href: '/robots/boston-dynamics/spot' },
  { name: 'Unitree B2', href: '/robots/unitree/b2' },
];

function Examples({ items }: { items: GroupTeaser['examples'] }) {
  return items.length ? <ul>{items.map((e) => <li key={e.href}><span className={'verdict-dot is-' + e.verdict} title={VERDICT_LABELS[e.verdict]} /><span>{e.title}</span></li>)}</ul> : null;
}

/** The landing. Construction-wide: the question is which of a company's work is a candidate at all, before any robot is named. */
export function JourneyStart({ limits, groups }: { limits: LimitCard[]; groups: GroupTeaser[] }) {
  const main = groups.find((g) => g.group === 'site') ?? groups[0];
  const rest = groups.filter((g) => g !== main);
  return <>
    <section className="home-hero" aria-labelledby="home-title">
      <h1 id="home-title">Which of your work is a candidate <span>for a robot at all?</span></h1>
      <p className="jp-lede">Most obvious ideas fail one of five tests before any robot is named. Check your own tasks and see the better answer where they fail.</p>
      <div className="home-actions">
        <Link className={ui.btn} href="/use-cases">Find your work <Icon name="arrow" size={16} /></Link>
        <Link className={ui.btnGhost} href="/use-cases/criteria">How tasks are screened</Link>
      </div>
    </section>

    <figure className="home-lineup">
      <div className="home-lineup-stage">
        <Image src="/branding/lineup-at-scale.68df9778e0.png" width={2960} height={917} priority sizes="(min-width: 1152px) 1056px, calc(100vw - 64px)"
          alt="A construction worker in a hard hat, 1.80 m tall, and five robots from the catalogue side by side at true scale under a line at his height. The Unitree H2 reaches the line, the Unitree G1 comes to his shoulder, the Rainbow Robotics RB-Y1 sits on a wheeled base, and the two quadrupeds, Boston Dynamics Spot and Unitree B2, reach his hip." />
      </div>
      <figcaption>At true scale next to a 1.80 m site worker: {LINEUP.map((robot, i) => <span key={robot.href}>{i ? (i === LINEUP.length - 1 ? ' and ' : ', ') : ''}<Link href={robot.href}>{robot.name}</Link></span>)}. Rendered from their published models.</figcaption>
    </figure>

    <section className="home-limits" aria-labelledby="limits">
      <h2 id="limits">What today’s humanoids cannot do yet</h2>
      <dl>
        {limits.map((limit) => <div key={limit.id}>
          <dt>{limit.label}</dt>
          <dd className="home-limit-figure">{limit.figure}</dd>
          <dd className="home-limit-value">{sentence(limit.value.startsWith(limit.figure) ? limit.value.slice(limit.figure.length) : limit.value)}</dd>
          <dd className="home-limit-basis">{BASIS[limit.basis] ?? 'Sitebots assessment'}</dd>
        </div>)}
      </dl>
    </section>

    <section className="home-tests" aria-labelledby="five-tests">
      <div className="home-tests-head">
        <h2 id="five-tests">Five tests, before any robot is named</h2>
        <p>A task is a candidate only when all five hold. Where one fails, the check names the better answer.</p>
      </div>
      <ol aria-label="The five hard tests">
        {HARD_RULES.map((id) => <li key={id}><Icon name={id} size={20} /><div><strong>{TEST_SHORT[id]}</strong><p>{TEST_QUESTIONS[id]}</p></div></li>)}
      </ol>
    </section>

    <section className="home-library" aria-labelledby="library">
      <h2 id="library">Screened tasks across construction</h2>
      <p className="home-section-lede">Site work sorted like a Leistungsverzeichnis, by STLB-Bau Leistungsbereich, plus the factory, the yard and building operation. <Link className="jp-link text-foreground" href="/use-cases/criteria">How a task gets in</Link>.</p>
      <div className="home-bento">
        <Link className="home-bento-main" href={'/use-cases?group=' + main.group}>
          <Icon name={main.group} size={24} />
          <span className="home-bento-figure">{main.count}</span>
          <strong>{GROUP_LABELS[main.group]}</strong>
          <span className="group-count">Screened tasks in {plural(main.settings, main.group === 'site' ? 'trade' : 'setting')}</span>
          <dl className="home-bento-split">
            {(['candidate', 'marginal', 'ruled_out'] as const).map((v) => <div key={v}><dt><span className={'verdict-dot is-' + v} />{VERDICT_LABELS[v]}</dt><dd>{main.verdicts[v]}</dd></div>)}
          </dl>
          <Examples items={main.examples} />
          <span className="home-bento-more">Browse the trades <Icon name="arrow" size={16} /></span>
        </Link>
        {rest.map((g) => <Link key={g.group} className="home-bento-cell" href={'/use-cases?group=' + g.group}>
          <span className="home-bento-row"><Icon name={g.group} size={20} /><span className="home-bento-figure is-small">{g.count}</span></span>
          <strong>{GROUP_LABELS[g.group]}</strong>
          <span className="group-count">{g.count ? `Screened tasks in ${plural(g.settings, 'setting')}` : 'No tasks yet'}</span>
          <Examples items={g.examples.slice(0, 1)} />
        </Link>)}
      </div>
      <div className="map-legend"><span className="l-candidate">Candidate</span><span className="l-marginal">Marginal</span><span className="l-ruled_out">Ruled out, with a better answer</span></div>
    </section>

    <section className="home-steps" aria-labelledby="stations">
      <h2 id="stations">Three steps to a decision</h2>
      <ol aria-label="The three steps">
        {STATIONS.map((station) => <li key={station.id}><Link href={station.href}><span className="step-no">{station.number}</span><strong>{station.label}</strong><small>{station.question}</small></Link></li>)}
      </ol>
      <p className="home-note">No sign-up. Your shortlist stays in this browser.</p>
    </section>
  </>;
}
