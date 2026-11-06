import Link from 'next/link';
import { STATUS_LABELS, TYPE_PLURAL, priceText, type RobotCardData } from '@/lib/market/cards';
import { byPrice, filterParams, grossEur, isFiltered, matchesFilters, narrows, type Filters } from '@/lib/market/filters';
import { loadJobs, robotJobStats } from '@/lib/market/jobs';
import { STAGE_RANK } from '@/lib/market/match';
import { ROBOT_TYPES, type GermanyStatus, type RobotType } from '@/lib/market/schema';
import { JOB_LABELS } from '@/lib/market/vocab';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { germanTiles } from '@/lib/market/tiles';
import { CompareToggle } from '@/components/compare/CompareBar';
import { MarketFilters } from './MarketFilters';
import { RobotSearch, ScopeSwitch } from './RobotsToolbar';
import { TileSection } from './TileSection';
import './market.css';

// The robots page for buyers in Germany: what can be bought or ordered here, by type. Robots that are
// not sold here only appear in the worldwide view.

const ORDER: GermanyStatus[] = ['buy_now', 'quote', 'preorder'];
// With all types on one page, each type shows its first rows; its own tab shows the rest.
const PREVIEW = 9;
const INTRO: Record<RobotType, string> = {
  humanoid: 'Two arms and a head, on legs or on a wheeled base.',
  quadruped: 'Four legs, some with wheels or an arm, mostly for inspection rounds.',
  mobile_manipulator: 'One or two arms on a wheeled base.',
  specialised: 'Machines built for one construction job, grouped by job and maker.',
};

function MakerGroups({ robots }: { robots: RobotCardData[] }) {
  const jobs = [...new Set(robots.map((robot) => robot.jobKey ?? 'other'))].sort((a, b) => (JOB_LABELS[a] ?? a).localeCompare(JOB_LABELS[b] ?? b));
  return <div className="mk-jobgroups">{jobs.map((job) => {
    const inJob = robots.filter((robot) => (robot.jobKey ?? 'other') === job);
    const makers = [...new Set(inJob.map((robot) => robot.maker))].sort();
    return <section key={job} className="mk-jobgroup" aria-label={JOB_LABELS[job] ?? job}>
      <h3>{JOB_LABELS[job] ?? job} <span>{inJob.length}</span></h3>
      <ul>{makers.map((maker) => {
        const models = inJob.filter((robot) => robot.maker === maker).sort((a, b) => ORDER.indexOf(a.germany.status) - ORDER.indexOf(b.germany.status) || a.name.localeCompare(b.name));
        const head = models[0];
        return <li key={maker}>
          <Link href={head.href} className="mk-maker-row">
            {head.picture ? <img src={head.picture.src} alt={head.picture.alt} width={head.picture.width} height={head.picture.height} loading="lazy" decoding="async" /> : <span className="mk-maker-thumb" />}
            <span><strong>{maker}</strong><small>{models.length > 1 ? models.length + ' models' : head.name}</small></span>
            <span className="mk-status" data-s={head.germany.status}>{STATUS_LABELS[head.germany.status]}</span>
          </Link>
          {models.length > 1
            ? <details className="mk-siblings"><summary>Show the {models.length} models</summary><ul>{models.map((robot) => <li key={robot.id} className="mk-model-row"><Link href={robot.href}>{robot.name}</Link><span>{priceText(robot)}</span><CompareToggle id={robot.id} name={robot.name} /></li>)}</ul></details>
            : <div className="mk-maker-compare"><CompareToggle id={head.id} name={head.name} /></div>}
        </li>;
      })}</ul>
    </section>;
  })}</div>;
}

const matches = (robot: RobotCardData, words: string[]) => words.every((word) => (robot.name + ' ' + robot.maker).toLowerCase().includes(word));

export async function MarketListing({ type, q, filters }: { type: RobotType | ''; q?: string; filters: Filters }) {
  const { robots, jobs, marketRobots } = loadJobs();
  const fits = robotJobStats(jobs);
  // Robots in real use first within each status (a pilot or daily use on a job, then how many jobs),
  // then the jobs they fit on paper. A maker's claim alone does not lift a robot up the list.
  const used = (id: string) => (fits[id]?.best ?? 0) >= STAGE_RANK.pilot ? fits[id].best * 100 + fits[id].atBest : 0;
  const byProof = (a: RobotCardData, b: RobotCardData) => used(b.id) - used(a.id) || (fits[b.id]?.strong ?? 0) - (fits[a.id]?.strong ?? 0);
  const order = filters.sort ? byPrice(filters.sort) : (a: RobotCardData, b: RobotCardData) => ORDER.indexOf(a.germany.status) - ORDER.indexOf(b.germany.status) || byProof(a, b);
  const words = (q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const inScope = (robot: RobotCardData) => (!type || robot.robotType === type) && matches(robot, words) && robot.germany.status !== 'not_sold';
  const shown = robots.filter((robot) => (!type || robot.robotType === type) && matches(robot, words) && matchesFilters(robot, filters));
  const sold = shown.filter((robot) => robot.germany.status !== 'not_sold');
  // Said out loud, so a short list under a price limit is not read as "nothing else exists".
  const unpriced = filters.maxPrice ? robots.filter((robot) => inScope(robot) && grossEur(robot) === null && matchesFilters(robot, filters, { ignorePrice: true })).length : 0;
  const preview = !type && !q && !isFiltered(filters);
  const world = '/robots?scope=world' + (q ? '&q=' + encodeURIComponent(q) : '');
  const count = (status: GermanyStatus) => robots.filter((robot) => robot.germany.status === status).length;
  // Counted like the landing page: general robots and job-specific machines apart.
  const orderable = (machines: boolean) => robots.filter((robot) => (robot.robotType === 'specialised') === machines && (robot.germany.status === 'buy_now' || robot.germany.status === 'quote')).length;
  const groups = ROBOT_TYPES.filter((robotType) => !type || robotType === type).map((robotType) => {
    const items = sold.filter((robot) => robot.robotType === robotType).sort((a, b) => order(a, b) || a.name.localeCompare(b.name));
    return { robotType, items, visible: robotType === 'specialised' ? [] : preview ? items.slice(0, PREVIEW) : items };
  }).filter((group) => group.items.length);
  const tiles = new Map((await germanTiles(groups.flatMap((group) => group.visible), new Map(marketRobots.map((robot) => [robot.id, robot])), fits)).map((tile) => [tile.id, tile]));
  const kept = filterParams(filters);
  const href = (robotType: RobotType | '') => {
    const sp = new URLSearchParams();
    if (robotType) sp.set('type', robotType);
    if (q) sp.set('q', q);
    for (const [name, value] of Object.entries(kept)) if (value) sp.set(name, value);
    return '/robots' + (sp.size ? '?' + sp.toString() : '');
  };
  const clear = '/robots' + (type ? '?type=' + type : '');
  return <main className="mk-page">
    <header className="mk-page-head">
      <ScopeSwitch world={false} q={q} />
      <h1>Robots you can buy in Germany</h1>
      <p>{orderable(false)} robots and {orderable(true)} job-specific machines you can buy or order here, {count('preorder')} more on pre-order. Every price and seller links to the page it was read from. Robots that are not sold here are under <Link href={world} className="underline underline-offset-2">Worldwide</Link>.</p>
    </header>
    <div className="card mt-6 flex flex-wrap items-center gap-3 p-2">
      <nav className={cn(ui.segment, 'max-w-full flex-wrap')} aria-label="Robot type">
        <Link href={href('')} className={cn(ui.segmentItem, !type && ui.segmentActive)} aria-current={!type ? 'page' : undefined}>All</Link>
        {ROBOT_TYPES.map((robotType) => <Link key={robotType} href={href(robotType)} className={cn(ui.segmentItem, type === robotType && ui.segmentActive)} aria-current={type === robotType ? 'page' : undefined}>{TYPE_PLURAL[robotType]}</Link>)}
      </nav>
      <RobotSearch q={q} keep={{ type: type || undefined, ...kept }} />
    </div>
    <MarketFilters filters={filters} keep={{ type: type || undefined, q }} />
    {q ? <p className="label mt-6">{sold.length} robot{sold.length === 1 ? '' : 's'} matching “{q}” · <Link href={href(type)} className="normal-case tracking-normal underline underline-offset-2">clear</Link></p> : null}
    {narrows(filters) && sold.length ? <p className="label mt-6 normal-case tracking-normal" data-testid="filter-count">{sold.length} robot{sold.length === 1 ? '' : 's'} match these filters{unpriced ? ', ' + unpriced + ' more without a published price are left out' : ''}.</p> : null}
    {narrows(filters) && !sold.length ? <div className="card mt-6 px-6 py-10 text-center text-muted" data-testid="filter-empty">
      <p>No robot sold in Germany matches these filters.{unpriced ? ' ' + unpriced + (unpriced === 1 ? ' robot has' : ' robots have') + ' no published price; ask the seller for a quote.' : ''}</p>
      <Link href={clear} className={ui.btnSecondary + ' mt-5 whitespace-normal'}>Clear filters</Link>
    </div> : null}
    {groups.map(({ robotType, items, visible }) => robotType === 'specialised'
      ? <section key={robotType} className="mk-page-section" aria-labelledby={'type-' + robotType}>
        <div className="mk-page-section-head"><h2 id={'type-' + robotType}>{TYPE_PLURAL[robotType]} <span>{items.length}</span></h2><p>{INTRO[robotType]}</p></div>
        <MakerGroups robots={items} />
      </section>
      : <TileSection key={robotType} id={'type-' + robotType} title={TYPE_PLURAL[robotType]} count={items.length} intro={INTRO[robotType]}
        tiles={visible.flatMap((robot) => tiles.get(robot.id) ?? [])}
        more={preview && items.length > PREVIEW ? { href: href(robotType), label: 'Show all ' + items.length + ' ' + TYPE_PLURAL[robotType].toLowerCase() } : null} />)}
    {q && !sold.length ? <div className="card mt-6 px-6 py-10 text-center text-muted">
      <p>No robot sold in Germany matches “{q}”.{shown.length ? ' ' + shown.length + (shown.length === 1 ? ' robot that is not sold here does.' : ' robots that are not sold here do.') : ''}</p>
      <Link href={world} className={ui.btnSecondary + ' mt-5 whitespace-normal'}>Search all robots worldwide</Link>
    </div> : null}
    {!robots.length ? <p className="mk-muted">The market research is still running.</p> : null}
  </main>;
}
