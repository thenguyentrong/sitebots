import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { GrowthChart, LineChart, YearBars } from '@/components/home/charts';
import { CountUp, HeroVideo, InView, VideoCard } from '@/components/home/motion';
import { SettingTiles } from '@/components/use-cases/SettingTiles';
import { StageBar, StageLegend, photoFit } from '@/components/use-cases/parts';
import { buyGroups, industryFigures, industrySeries, labourShares, useCaseOverview, useCaseYears, videos, workPhotos } from '@/lib/home';
import { robotHref } from '@/lib/market/links';
import { HOME_DESCRIPTION, publicMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { ui } from '@/lib/ui';
import '@/components/home/home.css';

export const metadata = publicMetadata({ title: SITE.tagline, description: HOME_DESCRIPTION, path: '/', absoluteTitle: true });

type Search = Promise<Record<string, string | undefined>>;
const nf = new Intl.NumberFormat('en-GB');
const eur = (n: number, digits = 0) => '€' + n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const PLURAL: Record<string, string> = { humanoid: 'Humanoids', quadruped: 'Robot dogs', mobile_manipulator: 'Mobile manipulators', specialised: 'Job-specific robots' };

function SourceLink({ publisher, url, year }: { publisher: string; url: string; year?: string | number }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-faint underline-offset-2 hover:text-foreground hover:underline">{publisher}{year ? ', ' + year : ''} ↗</a>;
}

function Heading({ kicker, title, lead, id }: { kicker?: string; title: string; lead?: string; id: string }) {
  return <div className="rv mb-6 max-w-3xl">
    {kicker ? <p className="label">{kicker}</p> : null}
    <h2 id={id} className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h2>
    {lead ? <p className="mt-2 text-base text-muted">{lead}</p> : null}
  </div>;
}

export default async function Home({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  // The adviser lived here until 19 Nov 2026: a sign-in return or a question in the address goes to its own page.
  if (sp.signin || sp.q) redirect('/advisor?' + new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => v ? [[k, v]] : [])).toString());

  const figures = industryFigures();
  const series = industrySeries();
  const labour = labourShares();
  const { stats, tiles } = useCaseOverview();
  const years = useCaseYears();
  const groups = buyGroups();
  const films = videos();
  const strip = workPhotos(18);
  const orderable = groups.reduce((n, g) => n + g.count, 0);
  const max = Math.max(...labour.top.map((row) => row.value));
  const workforce = series.get('workforce');
  const fatal = series.get('fatal');
  const cost = series.get('labour-cost');
  const retiring = figures.find((f) => f.id === 'retiring');
  const apprentices = figures.find((f) => f.id === 'apprentices');
  const productivity = figures.find((f) => f.id === 'productivity');
  const lastYear = years.at(-1);
  const firstReal = years.find((y) => y.deployment);

  return <main className="pb-24">
    {/* Opening: real site footage, the claim, three live counts. */}
    <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden bg-black text-white" aria-labelledby="home-title">
      <HeroVideo src="/video/site-aerial.mp4" poster="/video/site-aerial.webp" />
      <span aria-hidden className="absolute inset-0 bg-black/45" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-14 pt-32 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/75">Robots for German building sites</p>
        {/* One sentence per line; balance keeps a lone last word ("do.") from dropping down on narrow screens. */}
        <h1 id="home-title" className="mt-3 max-w-5xl text-balance text-[2.5rem] font-semibold leading-[1.02] tracking-tight [text-shadow:0_2px_24px_rgb(0_0_0/0.45)] sm:text-7xl"><span className="block">The site needs more hands.</span> <span className="block">See what robots already do.</span></h1>
        <p className="mt-5 max-w-2xl text-lg text-white/85">Checked figures on the German building trade, real footage and records of robots at work, and the robots you can order in Germany today. Every number links to where it was read.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/use-cases" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-black transition hover:bg-white/90 active:scale-[0.98]">See where robots work<ArrowRight size={16} weight="bold" /></Link>
          <Link href="/robots" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/40 px-5 text-sm font-medium text-white transition hover:bg-white/10">Robots you can buy</Link>
        </div>
        <dl className="mt-12 grid max-w-3xl grid-cols-3 gap-6 border-t border-white/25 pt-6">
          <div><dt className="text-xs text-white/70">Documented robot jobs</dt><dd className="mt-1 text-3xl font-semibold sm:text-4xl"><CountUp text={nf.format(stats.total)} /></dd></div>
          <div><dt className="text-xs text-white/70">Countries</dt><dd className="mt-1 text-3xl font-semibold sm:text-4xl"><CountUp text={String(stats.countries)} /></dd></div>
          <div><dt className="text-xs text-white/70">Robots to order in Germany</dt><dd className="mt-1 text-3xl font-semibold sm:text-4xl"><CountUp text={nf.format(orderable)} /></dd></div>
        </dl>
        <p className="mt-6 text-[11px] text-white/55">Footage: building site from above, Pexels.</p>
      </div>
    </section>

    {/* Robots at work, moving past. */}
    {strip.length ? <section aria-label="Robots at work" className="marquee py-6">
      <div className="marquee-track">
        {[...strip, ...strip].map((p, i) => <Link key={p.src + i} href={p.href} className="marquee-item" tabIndex={i >= strip.length ? -1 : undefined} aria-hidden={i >= strip.length || undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.src} alt={i < strip.length ? p.alt : ''} loading="lazy" decoding="async" />
          <span>{p.robot}</span>
        </Link>)}
      </div>
    </section> : null}

    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      {/* The labour gap, as lines and bars. */}
      <InView as="section" className="mt-12" >
        <Heading id="gap-title" kicker="The labour gap" title="Fewer hands, the same work" lead="The workforce peaked in 2023 and is shrinking, more people retire than start, and output per worker has fallen since 2010." />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          {workforce ? <figure className="rv card p-5">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-2"><span className="text-sm font-semibold">People working in German construction</span><span className="text-xs text-muted">thousands, 2016–2025</span></figcaption>
            <div className="mt-3"><LineChart points={workforce.points} min={2400} max={2700} format={(v) => nf.format(Math.round(v))} label="People working in German construction, thousands" /></div>
            <SourceLink publisher={workforce.source.publisher} url={workforce.source.url} year={2025} />
            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-edge/70 pt-5">
              <div><dt className="text-xs text-muted">Peak, 2023</dt><dd className="mt-1 text-2xl font-semibold tracking-tight"><CountUp text="2.64" /><span className="ml-1 text-sm font-normal text-muted">million</span></dd></div>
              <div><dt className="text-xs text-muted">2025</dt><dd className="mt-1 text-2xl font-semibold tracking-tight"><CountUp text="2.58" /><span className="ml-1 text-sm font-normal text-muted">million</span></dd></div>
              {productivity ? <div><dt className="text-xs text-muted">Output per worker since 2010</dt><dd className="mt-1 text-2xl font-semibold tracking-tight text-[var(--accent)]"><CountUp text={productivity.value} /></dd><dd className="mt-1"><SourceLink publisher="DIW Berlin" url={productivity.source.url} year={2026} /></dd></div> : null}
            </dl>
          </figure> : null}
          <div className="grid grid-cols-1 gap-5">
            {retiring && apprentices ? <figure className="rv card p-5" style={{ ['--d' as string]: '120ms' }}>
              <figcaption className="text-sm font-semibold">More leave than start</figcaption>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <div className="flex items-baseline justify-between"><span>Retiring each year, on average</span><span className="num font-semibold">20,000+</span></div>
                  <span className="mt-1.5 block h-3 overflow-hidden rounded-full bg-subtle"><span className="hbar block h-full rounded-full bg-[var(--accent)]" style={{ width: '100%' }} /></span>
                </div>
                <div>
                  <div className="flex items-baseline justify-between"><span>New apprentices in 2025</span><span className="num font-semibold">13,603</span></div>
                  <span className="mt-1.5 block h-3 overflow-hidden rounded-full bg-subtle"><span className="hbar block h-full rounded-full bg-edge-strong" style={{ width: `${(13603 / 20000) * 100}%`, ['--d' as string]: '200ms' }} /></span>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">More than 200,000 workers retire in the next ten years, over 20,000 a year on average (our division).</p>
              <p className="mt-2"><SourceLink publisher="SOKA-BAU" url={retiring.source.url} year={2025} /></p>
            </figure> : null}
            {fatal ? <figure className="rv card p-5" style={{ ['--d' as string]: '220ms' }}>
              <figcaption className="text-sm font-semibold">Deaths at work on building sites</figcaption>
              <div className="mt-2"><YearBars points={fatal.points} label="Fatal work accidents, BG BAU members" /></div>
              <SourceLink publisher={fatal.source.publisher} url={fatal.source.url} year={2025} />
            </figure> : null}
          </div>
        </div>
      </InView>

      {/* The eight checked figures, counting up. */}
      {figures.length ? <InView as="section" className="mt-14">
        <Heading id="numbers-title" kicker="In numbers" title="German construction today" lead="From Destatis, SOKA-BAU, BG BAU, DIW Berlin and the construction industry federation. Each figure links to its page." />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {figures.map((f, i) => <figure key={f.id} className="rv card flex flex-col gap-2 p-4 sm:p-5" style={{ ['--d' as string]: `${i * 60}ms` }}>
            <p className="leading-none"><span className="text-3xl font-semibold tracking-tight sm:text-4xl"><CountUp text={f.value} /></span>{f.unit ? <span className="ml-1 text-base text-muted">{f.unit}</span> : null}</p>
            <p className="text-sm font-medium">{f.label}</p>
            <p className="text-xs text-muted">{f.context}</p>
            <figcaption className="mt-auto flex flex-wrap gap-x-3 pt-2"><SourceLink publisher={f.source.publisher} url={f.source.url} year={f.year} />{f.also ? <SourceLink publisher={f.also.publisher} url={f.also.url} /> : null}</figcaption>
          </figure>)}
        </div>
      </InView> : null}

      {/* Growth of documented robot jobs, from our own records. */}
      {years.length ? <InView as="section" className="mt-16">
        <Heading id="growth-title" kicker="Robots on real projects" title="Robot jobs are taking off" lead={`Documented robot jobs per year, by the date of their source${lastYear ? `, ${lastYear.deployment + lastYear.pilot + lastYear.demo} so far in ${lastYear.year}` : ''}${firstReal ? `; the first in daily use dates from ${firstReal.year}` : ''}. Maker claims without a shown job are not counted.`} />
        <figure className="rv card p-5">
          <GrowthChart years={years} />
          <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3"><StageLegend /><Link href="/use-cases" className="text-xs text-muted underline underline-offset-2 hover:text-foreground">Every job with its source</Link></figcaption>
        </figure>
      </InView> : null}

      {/* Real footage, played on click. */}
      {films.length ? <InView as="section" className="mt-16">
        <Heading id="films-title" kicker="Real footage" title="Watch them work" lead="Films by the makers and their customers, from sites and factories. They load from YouTube only when you press play." />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {films.map((v, i) => <div key={v.id} className="rv" style={{ ['--d' as string]: `${(i % 3) * 80}ms` }}>
            <VideoCard id={v.id} thumb={v.thumb} label={v.label} channel={v.channel} title={v.title} />
            <Link href={robotHref(v.robotId)} className="mt-1 inline-block text-xs text-muted underline underline-offset-2 hover:text-foreground">The robot, its price and its jobs</Link>
          </div>)}
        </div>
      </InView> : null}

      {/* Where labour is most of the price. */}
      <InView as="section" className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="rv card overflow-hidden">
          <header className="border-b border-edge/70 px-5 py-4">
            <h2 className="text-lg font-semibold tracking-tight">Where labour is most of the price</h2>
            <p className="mt-0.5 text-xs text-muted">Personnel costs as a share of production value, firms with 20 or more staff, 2024. The higher the share, the more a robot that saves hours is worth.</p>
          </header>
          <ul className="space-y-2.5 px-5 py-4" aria-label="Labour share by trade">
            {labour.top.map((row, i) => <li key={row.wz} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
              <span className="leading-snug">{row.label}</span>
              <span className="hbar h-2.5 rounded-r-[4px] bg-[var(--accent)]" style={{ width: `${(row.value / max) * 100}%`, ['--d' as string]: `${i * 50}ms` }} aria-hidden />
              <span className="num text-right text-xs text-muted">{row.value.toFixed(1)}%</span>
            </li>)}
            {labour.building ? <li className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3rem] items-center gap-3 border-t border-edge/70 pt-2.5 text-sm text-muted">
              <span className="leading-snug">{labour.building.label}, for scale</span>
              <span className="hbar h-2.5 rounded-r-[4px] bg-edge-strong" style={{ width: `${(labour.building.value / max) * 100}%`, ['--d' as string]: '550ms' }} aria-hidden />
              <span className="num text-right text-xs">{labour.building.value.toFixed(1)}%</span>
            </li> : null}
          </ul>
          <p className="border-t border-edge/70 px-5 py-2.5"><SourceLink publisher={labour.source.publisher + ', Kostenstrukturerhebung im Baugewerbe'} url={labour.source.url} year={2024} /></p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {labour.hourly ? <div className="rv card flex flex-col gap-2 p-5" style={{ ['--d' as string]: '120ms' }}>
            <p className="text-5xl font-semibold leading-none tracking-tight"><CountUp text={eur(labour.hourly.value, 2)} /></p>
            <p className="text-sm font-medium">Labour cost per hour worked in construction</p>
            {cost ? <div className="mt-1"><YearBars points={cost.points} label="Labour cost per hour, euro" /></div> : null}
            <p className="mt-auto pt-1"><SourceLink publisher="Destatis, GENESIS 62431-0001" url="https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/04/PD26_148_624.html" year={labour.hourly.year} /></p>
          </div> : null}
          {labour.ecklohn ? <div className="rv card flex flex-col gap-2 p-5" style={{ ['--d' as string]: '200ms' }}>
            <p className="text-5xl font-semibold leading-none tracking-tight"><CountUp text={eur(labour.ecklohn.value, 2)} /></p>
            <p className="text-sm font-medium">Skilled worker&apos;s standard wage per hour, gross</p>
            <p className="text-xs text-muted">{labour.ecklohn.group} of the main construction wage agreement, from April 2026, before employer costs.</p>
            <p className="mt-auto pt-2 text-xs text-faint">TV Lohn Bauhauptgewerbe of 14 June 2024</p>
          </div> : null}
        </div>
      </InView>

      <InView as="section" className="mt-16">
        <div className="mb-5 grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <Heading id="work-title" kicker="Where" title="Robots already at work" lead={`${nf.format(stats.byStage.deployment)} in daily use, ${nf.format(stats.byStage.pilot)} pilots on real projects and ${nf.format(stats.byStage.demo)} demonstrations, by ${stats.robots} robots in ${stats.countries} countries.`} />
          <div className="rv space-y-2"><StageBar stages={stats.byStage} className="h-3" /><StageLegend /></div>
        </div>
        <div className="rv"><SettingTiles tiles={tiles.slice(0, 6)} base="/use-cases" /></div>
        <p className="mt-4"><Link href="/use-cases" className={ui.btnSecondary}>All use cases, map and sources<ArrowRight size={16} weight="bold" /></Link></p>
      </InView>

      <InView as="section" className="mt-16">
        <Heading id="buy-title" kicker="Buy" title="Robots you can order in Germany" lead="From a German or EU seller, in a shop or on request. Prices as the sellers publish them." />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {groups.map((g, i) => <Link key={g.type} href={'/robots?type=' + g.type} className="rv card group flex flex-col overflow-hidden transition hover:border-edge-strong" style={{ ['--d' as string]: `${i * 70}ms` }}>
            <span className="relative block aspect-[4/3] overflow-hidden bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {g.picture ? <img src={g.picture.src} alt={g.picture.alt} loading="lazy" decoding="async" className={photoFit(g.picture) + ' h-full w-full transition duration-500 group-hover:scale-[1.04]'} /> : null}
            </span>
            <span className="flex flex-1 flex-col gap-1 p-4">
              <span className="text-3xl font-semibold leading-none tracking-tight"><CountUp text={String(g.count)} /></span>
              <span className="font-medium">{PLURAL[g.type] ?? g.label}</span>
              <span className="text-xs text-muted">{g.from ? 'Prices from ' + eur(g.from) : 'Prices on request'}{g.priced ? ` · ${g.priced} with a published price` : ''}</span>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-muted group-hover:text-foreground">See them<ArrowRight size={14} weight="bold" /></span>
            </span>
          </Link>)}
        </div>
      </InView>

      <section aria-labelledby="ask-title" className="card mt-16 grid grid-cols-1 items-center gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <h2 id="ask-title" className="text-2xl font-semibold tracking-tight">Which robot fits your job?</h2>
          <p className="mt-2 text-sm text-muted">Describe the job, the site and the load. The advisor matches it against these records and shows its sources. Sign in for the free allowance, or use your own API key.</p>
        </div>
        <form action="/advisor" method="get" className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="ask" className="sr-only">Your job</label>
          <input id="ask" name="q" required maxLength={600} placeholder="e.g. drilling 2,000 ceiling holes in an office block" className={ui.input + ' h-12 flex-1 text-[15px]'} />
          <button type="submit" className={ui.btn + ' h-12'}>Ask the advisor</button>
        </form>
      </section>
    </div>
  </main>;
}
