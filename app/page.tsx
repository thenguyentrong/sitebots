import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { SettingTiles } from '@/components/use-cases/SettingTiles';
import { StageBar, StageLegend, photoFit } from '@/components/use-cases/parts';
import { buyGroups, industryFigures, labourShares, useCaseOverview } from '@/lib/home';
import { HOME_DESCRIPTION, publicMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { ui } from '@/lib/ui';

export const metadata = publicMetadata({ title: SITE.tagline, description: HOME_DESCRIPTION, path: '/', absoluteTitle: true });

type Search = Promise<Record<string, string | undefined>>;
const nf = new Intl.NumberFormat('en-GB');
const eur = (n: number, digits = 0) => '€' + n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const PLURAL: Record<string, string> = { humanoid: 'Humanoids', quadruped: 'Robot dogs', mobile_manipulator: 'Mobile manipulators', specialised: 'Job-specific robots' };

function SourceLink({ publisher, url, year }: { publisher: string; url: string; year?: string | number }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-faint underline-offset-2 hover:text-foreground hover:underline">{publisher}{year ? ', ' + year : ''} ↗</a>;
}

export default async function Home({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  // The adviser lived here until 19 Nov 2026: a sign-in return or a question in the address goes to its own page.
  if (sp.signin || sp.q) redirect('/advisor?' + new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => v ? [[k, v]] : [])).toString());

  const figures = industryFigures();
  const labour = labourShares();
  const { stats, tiles } = useCaseOverview();
  const groups = buyGroups();
  const orderable = groups.reduce((n, g) => n + g.count, 0);
  const hero = tiles.flatMap((tile) => tile.picture ? [{ ...tile.picture, id: tile.id, label: tile.label, count: tile.count }] : []).slice(0, 3);
  const max = Math.max(...labour.top.map((row) => row.value));

  return <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
    <section className="grid grid-cols-1 items-center gap-10 pb-14 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]" aria-labelledby="home-title">
      <div>
        <p className="label">Robots for German building sites</p>
        <h1 id="home-title" className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">The site needs more hands. See what robots already do.</h1>
        <p className="mt-5 max-w-xl text-base text-muted">Checked figures on the German building trade, {nf.format(stats.total)} documented robot jobs from {stats.countries} countries, and {nf.format(orderable)} robots you can order in Germany today. Every number links to where it was read.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/use-cases" className={ui.btn}>See where robots work<ArrowRight size={16} weight="bold" /></Link>
          <Link href="/robots" className={ui.btnSecondary}>Robots you can buy</Link>
        </div>
      </div>
      {hero.length === 3 ? <div className="grid h-[360px] grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] grid-rows-2 gap-3 sm:h-[440px]">
        {hero.map((photo, i) => <Link key={photo.src} href={'/use-cases#' + photo.id} className={'group relative overflow-hidden rounded-2xl bg-subtle ' + (i === 0 ? 'row-span-2' : '')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.src} alt={photo.alt} loading="eager" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_30%] transition duration-700 group-hover:scale-[1.04]" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/0" />
          <span className="absolute inset-x-0 bottom-0 p-4 text-white">
            <span className="num block text-2xl font-semibold leading-none">{photo.count} <span className="text-sm font-medium text-white/85">uses</span></span>
            <span className="mt-1 block text-sm font-medium leading-snug">{photo.label}</span>
          </span>
        </Link>)}
      </div> : null}
    </section>

    {figures.length ? <section aria-labelledby="numbers-title" className="border-t border-edge pt-12">
      <div className="mb-6">
        <h2 id="numbers-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">German construction in numbers</h2>
        <p className="mt-1 text-sm text-muted">From Destatis, SOKA-BAU, BG BAU, DIW Berlin and the construction industry federation. Each figure links to its page.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {figures.map((f) => <figure key={f.id} className="card flex flex-col gap-2 p-4 sm:p-5">
          <p className="num leading-none"><span className="text-3xl font-semibold tracking-tight sm:text-4xl">{f.value}</span>{f.unit ? <span className="ml-1 text-base text-muted">{f.unit}</span> : null}</p>
          <p className="text-sm font-medium">{f.label}</p>
          <p className="text-xs text-muted">{f.context}</p>
          <figcaption className="mt-auto flex flex-wrap gap-x-3 pt-2"><SourceLink publisher={f.source.publisher} url={f.source.url} year={f.year} />{f.also ? <SourceLink publisher={f.also.publisher} url={f.also.url} /> : null}</figcaption>
        </figure>)}
      </div>
    </section> : null}

    <section aria-labelledby="labour-title" className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="card overflow-hidden">
        <header className="border-b border-edge/70 px-5 py-4">
          <h2 id="labour-title" className="text-lg font-semibold tracking-tight">Where labour is most of the price</h2>
          <p className="mt-0.5 text-xs text-muted">Personnel costs as a share of production value, firms with 20 or more staff, 2024. The higher the share, the more a robot that saves hours is worth.</p>
        </header>
        <ul className="space-y-2.5 px-5 py-4" aria-label="Labour share by trade">
          {labour.top.map((row) => <li key={row.wz} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
            <span className="leading-snug">{row.label}</span>
            <span className="h-2.5 rounded-r-[4px] bg-[var(--accent)]" style={{ width: `${(row.value / max) * 100}%` }} aria-hidden />
            <span className="num text-right text-xs text-muted">{row.value.toFixed(1)}%</span>
          </li>)}
          {labour.building ? <li className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3rem] items-center gap-3 border-t border-edge/70 pt-2.5 text-sm text-muted">
            <span className="leading-snug">{labour.building.label}, for scale</span>
            <span className="h-2.5 rounded-r-[4px] bg-edge-strong" style={{ width: `${(labour.building.value / max) * 100}%` }} aria-hidden />
            <span className="num text-right text-xs">{labour.building.value.toFixed(1)}%</span>
          </li> : null}
        </ul>
        <p className="border-t border-edge/70 px-5 py-2.5"><SourceLink publisher={labour.source.publisher + ', Kostenstrukturerhebung im Baugewerbe'} url={labour.source.url} year={2024} /></p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {labour.hourly ? <div className="card flex flex-col gap-2 p-5">
          <p className="num text-5xl font-semibold leading-none tracking-tight">{eur(labour.hourly.value, 2)}</p>
          <p className="text-sm font-medium">Labour cost per hour worked in construction</p>
          <p className="text-xs text-muted">Wages plus employer costs, {labour.hourly.year} estimate.</p>
          <p className="mt-auto pt-2"><SourceLink publisher="Destatis, GENESIS 62431-0001" url="https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/04/PD26_148_624.html" year={labour.hourly.year} /></p>
        </div> : null}
        {labour.ecklohn ? <div className="card flex flex-col gap-2 p-5">
          <p className="num text-5xl font-semibold leading-none tracking-tight">{eur(labour.ecklohn.value, 2)}</p>
          <p className="text-sm font-medium">Skilled worker&apos;s standard wage per hour, gross</p>
          <p className="text-xs text-muted">{labour.ecklohn.group} of the main construction wage agreement, from April 2026, before employer costs.</p>
          <p className="mt-auto pt-2 text-xs text-faint">TV Lohn Bauhauptgewerbe of 14 June 2024</p>
        </div> : null}
      </div>
    </section>

    <section aria-labelledby="work-title" className="mt-16">
      <div className="mb-5 grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div>
          <h2 id="work-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Robots already at work</h2>
          <p className="mt-1 text-sm text-muted">{nf.format(stats.total)} documented jobs, each with a source: {nf.format(stats.byStage.deployment)} in daily use, {nf.format(stats.byStage.pilot)} pilots on real projects and {nf.format(stats.byStage.demo)} demonstrations, by {stats.robots} robots in {stats.countries} countries.</p>
        </div>
        <div className="space-y-2"><StageBar stages={stats.byStage} className="h-3" /><StageLegend /></div>
      </div>
      <SettingTiles tiles={tiles.slice(0, 6)} base="/use-cases" />
      <p className="mt-4"><Link href="/use-cases" className={ui.btnSecondary}>All use cases, map and sources<ArrowRight size={16} weight="bold" /></Link></p>
    </section>

    <section aria-labelledby="buy-title" className="mt-16">
      <h2 id="buy-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Robots you can order in Germany</h2>
      <p className="mb-5 mt-1 text-sm text-muted">From a German or EU seller, in a shop or on request. Prices as the sellers publish them.</p>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {groups.map((g) => <Link key={g.type} href={'/robots?type=' + g.type} className="card group flex flex-col overflow-hidden transition hover:border-edge-strong">
          <span className="relative block aspect-[4/3] overflow-hidden bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {g.picture ? <img src={g.picture.src} alt={g.picture.alt} loading="lazy" decoding="async" className={photoFit(g.picture) + ' h-full w-full transition duration-500 group-hover:scale-[1.03]'} /> : null}
          </span>
          <span className="flex flex-1 flex-col gap-1 p-4">
            <span className="num text-3xl font-semibold leading-none tracking-tight">{g.count}</span>
            <span className="font-medium">{PLURAL[g.type] ?? g.label}</span>
            <span className="text-xs text-muted">{g.from ? 'Prices from ' + eur(g.from) : 'Prices on request'}{g.priced ? ` · ${g.priced} with a published price` : ''}</span>
            <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-muted group-hover:text-foreground">See them<ArrowRight size={14} weight="bold" /></span>
          </span>
        </Link>)}
      </div>
    </section>

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
  </main>;
}
