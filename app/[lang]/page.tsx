import Link from '@/components/LocaleLink';
import { redirect } from 'next/navigation';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { GrowthChart, LineChart, YearBars } from '@/components/home/charts';
import { CountUp, HeroVideo, InView, VideoCard } from '@/components/home/motion';
import { SettingTiles } from '@/components/use-cases/SettingTiles';
import type { Metadata } from 'next';
import { StageBar, StageLegend, photoFit } from '@/components/use-cases/parts';
import { buyGroups, industryFigures, industrySeries, labourShares, useCaseOverview, useCaseYears, videos, workPhotos } from '@/lib/home';
import { COMMON } from '@/lib/i18n/common';
import { localePath, recordLang } from '@/lib/i18n/config';
import { formatEur, formatNumber, formatPercent, localiseFigure } from '@/lib/i18n/format';
import { HOME_TEXT } from '@/lib/i18n/home';
import { pageLang } from '@/lib/i18n/server';
import { typePlural } from '@/lib/market/cards';
import { robotHref } from '@/lib/market/links';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';
import '@/components/home/home.css';

type Params = Promise<{ lang: string }>;
type Search = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lang = await pageLang(params);
  return publicMetadata({ title: COMMON[lang].tagline, description: COMMON[lang].description, path: '/', lang, absoluteTitle: true });
}

/** Euro printed the English way, for <CountUp>: it reads English figures and writes them in the page's language. */
const eurFigure = (n: number, digits = 0) => '€' + n.toFixed(digits);

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

export default async function Home({ params, searchParams }: { params: Params; searchParams: Search }) {
  const lang = await pageLang(params);
  const sp = await searchParams;
  // The adviser lived here until 19 Nov 2026: a sign-in return or a question in the address goes to its own page,
  // in the language of the page it was asked on.
  if (sp.signin || sp.q) redirect(localePath('/advisor?' + new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => v ? [[k, v]] : [])).toString(), lang));

  const t = HOME_TEXT[lang];
  const nf = (n: number) => formatNumber(n, lang);
  const figures = industryFigures(lang);
  const series = industrySeries(lang);
  const labour = labourShares(lang);
  const { stats, tiles } = useCaseOverview(lang);
  const years = useCaseYears();
  const groups = buyGroups(lang);
  const films = videos(lang);
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
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/75">{t.heroKicker}</p>
        {/* One sentence per line; balance keeps a lone last word ("do.") from dropping down on narrow screens. */}
        <h1 id="home-title" className="mt-3 max-w-5xl text-balance text-[2.5rem] font-semibold leading-[1.02] tracking-tight [text-shadow:0_2px_24px_rgb(0_0_0/0.45)] sm:text-7xl"><span className="block">{t.heroLine1}</span> <span className="block">{t.heroLine2}</span></h1>
        <p className="mt-5 max-w-2xl text-lg text-white/85">{t.heroLead}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/use-cases" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-black transition hover:bg-white/90 active:scale-[0.98]">{t.ctaUses}<ArrowRight size={16} weight="bold" /></Link>
          <Link href="/robots" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/40 px-5 text-sm font-medium text-white transition hover:bg-white/10">{t.ctaBuy}</Link>
        </div>
        <dl className="mt-12 grid max-w-3xl grid-cols-3 gap-6 border-t border-white/25 pt-6">
          <div><dt className="text-xs text-white/70">{t.statJobs}</dt><dd className="mt-1 text-3xl font-semibold sm:text-4xl"><CountUp text={String(stats.total)} /></dd></div>
          <div><dt className="text-xs text-white/70">{t.statCountries}</dt><dd className="mt-1 text-3xl font-semibold sm:text-4xl"><CountUp text={String(stats.countries)} /></dd></div>
          <div><dt className="text-xs text-white/70">{t.statOrderable}</dt><dd className="mt-1 text-3xl font-semibold sm:text-4xl"><CountUp text={String(orderable)} /></dd></div>
        </dl>
        <p className="mt-6 text-[11px] text-white/55">{t.heroCredit}</p>
      </div>
    </section>

    {/* Robots at work, moving past. */}
    {strip.length ? <section aria-label={t.strip} className="marquee py-6">
      <div className="marquee-track">
        {[...strip, ...strip].map((p, i) => <Link key={p.src + i} href={p.href} className="marquee-item" tabIndex={i >= strip.length ? -1 : undefined} aria-hidden={i >= strip.length || undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.src} alt={i < strip.length ? p.alt : ''} lang={recordLang(lang)} loading="lazy" decoding="async" />
          <span>{p.robot}</span>
        </Link>)}
      </div>
    </section> : null}

    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      {/* The labour gap, as lines and bars. */}
      <InView as="section" className="mt-12" >
        <Heading id="gap-title" kicker={t.gapKicker} title={t.gapTitle} lead={t.gapLead} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          {workforce ? <figure className="rv card p-5">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-2"><span className="text-sm font-semibold">{t.workforceTitle}</span><span className="text-xs text-muted">{t.workforceUnit}</span></figcaption>
            <div className="mt-3"><LineChart points={workforce.points} min={2400} max={2700} format={(v) => nf(Math.round(v))} label={t.workforceChart} lang={lang} /></div>
            <SourceLink publisher={workforce.source.publisher} url={workforce.source.url} year={2025} />
            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-edge/70 pt-5">
              <div><dt className="text-xs text-muted">{t.peak2023}</dt><dd className="mt-1 text-2xl font-semibold tracking-tight"><CountUp text="2.64" /><span className="ml-1 text-sm font-normal text-muted">{t.million}</span></dd></div>
              <div><dt className="text-xs text-muted">2025</dt><dd className="mt-1 text-2xl font-semibold tracking-tight"><CountUp text="2.58" /><span className="ml-1 text-sm font-normal text-muted">{t.million}</span></dd></div>
              {productivity ? <div><dt className="text-xs text-muted">{t.perWorker}</dt><dd className="mt-1 text-2xl font-semibold tracking-tight text-[var(--accent)]"><CountUp text={productivity.value} /></dd><dd className="mt-1"><SourceLink publisher="DIW Berlin" url={productivity.source.url} year={2026} /></dd></div> : null}
            </dl>
          </figure> : null}
          <div className="grid grid-cols-1 gap-5">
            {retiring && apprentices ? <figure className="rv card p-5" style={{ ['--d' as string]: '120ms' }}>
              <figcaption className="text-sm font-semibold">{t.leaveTitle}</figcaption>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <div className="flex items-baseline justify-between"><span>{t.retiringRow}</span><span className="num font-semibold">{localiseFigure('20,000+', lang)}</span></div>
                  <span className="mt-1.5 block h-3 overflow-hidden rounded-full bg-subtle"><span className="hbar block h-full rounded-full bg-[var(--accent)]" style={{ width: '100%' }} /></span>
                </div>
                <div>
                  <div className="flex items-baseline justify-between"><span>{t.apprenticesRow}</span><span className="num font-semibold">{nf(13603)}</span></div>
                  <span className="mt-1.5 block h-3 overflow-hidden rounded-full bg-subtle"><span className="hbar block h-full rounded-full bg-edge-strong" style={{ width: `${(13603 / 20000) * 100}%`, ['--d' as string]: '200ms' }} /></span>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">{t.leaveNote}</p>
              <p className="mt-2"><SourceLink publisher="SOKA-BAU" url={retiring.source.url} year={2025} /></p>
            </figure> : null}
            {fatal ? <figure className="rv card p-5" style={{ ['--d' as string]: '220ms' }}>
              <figcaption className="text-sm font-semibold">{t.fatalTitle}</figcaption>
              <div className="mt-2"><YearBars points={fatal.points} label={t.fatalChart} lang={lang} /></div>
              <SourceLink publisher={fatal.source.publisher} url={fatal.source.url} year={2025} />
            </figure> : null}
          </div>
        </div>
      </InView>

      {/* The eight checked figures, counting up. */}
      {figures.length ? <InView as="section" className="mt-14">
        <Heading id="numbers-title" kicker={t.numbersKicker} title={t.numbersTitle} lead={t.numbersLead} />
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
        <Heading id="growth-title" kicker={t.growthKicker} title={t.growthTitle} lead={t.growthLead(lastYear ? { count: nf(lastYear.deployment + lastYear.pilot + lastYear.demo), year: lastYear.year } : null, firstReal?.year ?? null)} />
        <figure className="rv card p-5">
          <GrowthChart years={years} lang={lang} />
          <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3"><StageLegend lang={lang} /><Link href="/use-cases" className="text-xs text-muted underline underline-offset-2 hover:text-foreground">{t.growthLink}</Link></figcaption>
        </figure>
      </InView> : null}

      {/* Real footage, played on click. */}
      {films.length ? <InView as="section" className="mt-16">
        <Heading id="films-title" kicker={t.filmsKicker} title={t.filmsTitle} lead={t.filmsLead} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {films.map((v, i) => <div key={v.id} className="rv" style={{ ['--d' as string]: `${(i % 3) * 80}ms` }}>
            <VideoCard id={v.id} thumb={v.thumb} label={v.label} channel={v.channel} title={v.title} />
            <Link href={robotHref(v.robotId)} className="mt-1 inline-block text-xs text-muted underline underline-offset-2 hover:text-foreground">{t.filmRobot}</Link>
          </div>)}
        </div>
      </InView> : null}

      {/* Where labour is most of the price. */}
      <InView as="section" className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="rv card overflow-hidden">
          <header className="border-b border-edge/70 px-5 py-4">
            <h2 className="text-lg font-semibold tracking-tight">{t.labourTitle}</h2>
            <p className="mt-0.5 text-xs text-muted">{t.labourLead}</p>
          </header>
          <ul className="space-y-2.5 px-5 py-4" aria-label={t.labourList}>
            {labour.top.map((row, i) => <li key={row.wz} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
              <span className="leading-snug">{row.label}</span>
              <span className="hbar h-2.5 rounded-r-[4px] bg-[var(--accent)]" style={{ width: `${(row.value / max) * 100}%`, ['--d' as string]: `${i * 50}ms` }} aria-hidden />
              <span className="num text-right text-xs text-muted">{formatPercent(row.value, lang, 1)}</span>
            </li>)}
            {labour.building ? <li className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3rem] items-center gap-3 border-t border-edge/70 pt-2.5 text-sm text-muted">
              <span className="leading-snug">{t.forScale(labour.building.label)}</span>
              <span className="hbar h-2.5 rounded-r-[4px] bg-edge-strong" style={{ width: `${(labour.building.value / max) * 100}%`, ['--d' as string]: '550ms' }} aria-hidden />
              <span className="num text-right text-xs">{formatPercent(labour.building.value, lang, 1)}</span>
            </li> : null}
          </ul>
          <p className="border-t border-edge/70 px-5 py-2.5"><SourceLink publisher={labour.source.publisher + ', Kostenstrukturerhebung im Baugewerbe'} url={labour.source.url} year={2024} /></p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {labour.hourly ? <div className="rv card flex flex-col gap-2 p-5" style={{ ['--d' as string]: '120ms' }}>
            <p className="text-5xl font-semibold leading-none tracking-tight"><CountUp text={eurFigure(labour.hourly.value, 2)} /></p>
            <p className="text-sm font-medium">{t.hourlyLabel}</p>
            {cost ? <div className="mt-1"><YearBars points={cost.points} label={t.hourlyChart} lang={lang} /></div> : null}
            <p className="mt-auto pt-1"><SourceLink publisher="Destatis, GENESIS 62431-0001" url="https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/04/PD26_148_624.html" year={labour.hourly.year} /></p>
          </div> : null}
          {labour.ecklohn ? <div className="rv card flex flex-col gap-2 p-5" style={{ ['--d' as string]: '200ms' }}>
            <p className="text-5xl font-semibold leading-none tracking-tight"><CountUp text={eurFigure(labour.ecklohn.value, 2)} /></p>
            <p className="text-sm font-medium">{t.ecklohnLabel}</p>
            <p className="text-xs text-muted">{t.ecklohnNote(labour.ecklohn.group)}</p>
            <p className="mt-auto pt-2 text-xs text-faint">{t.ecklohnSource}</p>
          </div> : null}
        </div>
      </InView>

      <InView as="section" className="mt-16">
        <div className="mb-5 grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <Heading id="work-title" kicker={t.workKicker} title={t.workTitle} lead={t.workLead({ deployment: nf(stats.byStage.deployment), pilot: nf(stats.byStage.pilot), demo: nf(stats.byStage.demo), robots: nf(stats.robots), countries: nf(stats.countries) })} />
          <div className="rv space-y-2"><StageBar stages={stats.byStage} lang={lang} className="h-3" /><StageLegend lang={lang} /></div>
        </div>
        <div className="rv"><SettingTiles tiles={tiles.slice(0, 6)} base="/use-cases" lang={lang} /></div>
        <p className="mt-4"><Link href="/use-cases" className={ui.btnSecondary}>{t.workAll}<ArrowRight size={16} weight="bold" /></Link></p>
      </InView>

      <InView as="section" className="mt-16">
        <Heading id="buy-title" kicker={t.buyKicker} title={t.buyTitle} lead={t.buyLead} />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {groups.map((g, i) => <Link key={g.type} href={'/robots?type=' + g.type} className="rv card group flex flex-col overflow-hidden transition hover:border-edge-strong" style={{ ['--d' as string]: `${i * 70}ms` }}>
            <span className="relative block aspect-[4/3] overflow-hidden bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {g.picture ? <img src={g.picture.src} alt={g.picture.alt} lang={recordLang(lang)} loading="lazy" decoding="async" className={photoFit(g.picture) + ' h-full w-full transition duration-500 group-hover:scale-[1.04]'} /> : null}
            </span>
            <span className="flex flex-1 flex-col gap-1 p-4">
              <span className="text-3xl font-semibold leading-none tracking-tight"><CountUp text={String(g.count)} /></span>
              <span className="font-medium">{typePlural(g.type, lang)}</span>
              <span className="text-xs text-muted">{g.from ? t.pricesFrom(formatEur(g.from, lang)) : t.pricesOnRequest}{g.priced ? t.priced(nf(g.priced)) : ''}</span>
              <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-muted group-hover:text-foreground">{t.seeThem}<ArrowRight size={14} weight="bold" /></span>
            </span>
          </Link>)}
        </div>
      </InView>

      <section aria-labelledby="ask-title" className="card mt-16 grid grid-cols-1 items-center gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <h2 id="ask-title" className="text-2xl font-semibold tracking-tight">{t.askTitle}</h2>
          <p className="mt-2 text-sm text-muted">{t.askLead}</p>
        </div>
        <form action={localePath('/advisor', lang)} method="get" className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="ask" className="sr-only">{t.askLabel}</label>
          <input id="ask" name="q" required maxLength={600} placeholder={t.askPlaceholder} className={ui.input + ' h-12 flex-1 text-[15px]'} />
          <button type="submit" className={ui.btn + ' h-12'}>{t.askButton}</button>
        </form>
      </section>
    </div>
  </main>;
}
