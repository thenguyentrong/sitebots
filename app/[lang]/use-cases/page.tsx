import type { Metadata } from 'next';
import Link from '@/components/LocaleLink';
import { RobotUseCard } from '@/components/use-cases/RobotUseCard';
import { SettingTiles } from '@/components/use-cases/SettingTiles';
import { UseMap } from '@/components/use-cases/UseMap';
import { CountryFlag, StageBar, StageDot, StageLegend } from '@/components/use-cases/parts';
import type { Lang } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { pageLang } from '@/lib/i18n/server';
import { USE_CASES_TEXT } from '@/lib/i18n/use-cases';
import { groupByRobot, settingTiles, stageCounts, usePoints } from '@/lib/market/use-case-views';
import { REGIONS, SETTINGS, USE_STAGES, countryName, loadUseCases, regionLabel, settingText, useCaseStats, useStageLabel, type RegionId, type UseStage } from '@/lib/market/use-cases';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

type Params = Promise<{ lang: string }>;
type Search = Promise<{ region?: string; stage?: string; country?: string; setting?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lang = await pageLang(params);
  const t = USE_CASES_TEXT[lang];
  return publicMetadata({ title: t.metaTitle, description: t.metaDescription, path: '/use-cases', lang });
}

// Each kind of work shows its first cards; its own view (?setting=) shows them all, so the page stays light.
const FIRST = 6;

function BigNumber({ value, label, hint, lang }: { value: number; label: string; hint?: string; lang: Lang }) {
  return <div>
    <div className="num text-4xl font-semibold leading-none tracking-tight sm:text-5xl">{formatNumber(value, lang)}</div>
    <div className="mt-2 text-sm font-medium">{label}</div>
    {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
  </div>;
}

export default async function UseCasesPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const lang = await pageLang(params);
  const t = USE_CASES_TEXT[lang];
  const nf = (n: number) => formatNumber(n, lang);
  const sp = await searchParams;
  const all = loadUseCases();
  const stats = useCaseStats(all);
  const region = REGIONS.some((r) => r.id === sp.region) ? sp.region as RegionId : undefined;
  const stage = (USE_STAGES as readonly string[]).includes(String(sp.stage)) ? sp.stage as UseStage : undefined;
  const country = /^[A-Z]{2}$/.test(String(sp.country)) && all.some((use) => use.countries.includes(sp.country!)) ? sp.country : undefined;
  const shown = all.filter((use) => (!region || use.region === region) && (!stage || use.stage === stage) && (!country || use.countries.includes(country)));

  const only = SETTINGS.some((s) => s.id === sp.setting) ? sp.setting : undefined;
  // English paths: the links below add the /de prefix themselves (LocaleLink, and UseMap and SettingTiles for their plain links).
  const href = (next: { region?: string; stage?: string; country?: string; setting?: string }, hash = 'explore') => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ region, stage, country, setting: only, ...next })) if (v) q.set(k, v);
    const s = q.toString();
    return '/use-cases' + (s ? '?' + s : '') + '#' + hash;
  };
  const map = usePoints(shown, lang);
  const tiles = settingTiles(shown, lang);
  const top = groupByRobot(shown, undefined, lang).slice(0, 4);
  // Each robot card takes a photo no other card on the page shows yet, where the robot has more than one.
  const seen = new Set(top.flatMap((group) => group.picture ? [group.picture.src] : []));
  const sections = SETTINGS.map((s) => ({ id: s.id, ...settingText(s.id, lang), uses: shown.filter((use) => use.setting === s.id) })).filter((s) => s.uses.length && (!only || s.id === only))
    .sort((a, b) => b.uses.length - a.uses.length)
    .map((s) => ({ ...s, groups: groupByRobot(s.uses, seen, lang), stages: stageCounts(s.uses) }));
  const filtered = Boolean(region || stage || country);

  return <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
    <header className="grid grid-cols-1 items-end gap-10 pb-10 pt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div>
        <p className="label">{t.kicker}</p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">{t.title}</h1>
        <p className="mt-5 max-w-xl text-base text-muted">{t.lead}</p>
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-7">
          <BigNumber value={stats.total} label={t.totalLabel} hint={t.totalHint} lang={lang} />
          <BigNumber value={stats.byStage.deployment} label={t.dailyLabel} hint={t.dailyHint} lang={lang} />
          <BigNumber value={stats.robots} label={t.robotsLabel} hint={t.robotsHint(stats.makers)} lang={lang} />
          <BigNumber value={stats.countries} label={t.countriesLabel} hint={t.countriesHint} lang={lang} />
        </div>
        <div className="space-y-2">
          <StageBar stages={stats.byStage} lang={lang} className="h-3" />
          <StageLegend lang={lang} />
          <p className="text-xs text-faint">{t.claims(stats.claims)}</p>
        </div>
      </div>
    </header>

    <div id="explore" className="card flex scroll-mt-20 flex-wrap items-center gap-3 p-2">
      <nav className={cn(ui.segment, 'max-w-full flex-wrap')} aria-label={t.regionNav}>
        <Link href={href({ region: '', country: '' })} className={cn(ui.segmentItem, !region && !country && ui.segmentActive)} aria-current={!region && !country ? 'page' : undefined}>{t.worldwide}</Link>
        {REGIONS.filter((r) => r.id !== 'NONE' && stats.byRegion.find((x) => x.id === r.id)?.count).map((r) => <Link key={r.id} href={href({ region: r.id, country: '' })} className={cn(ui.segmentItem, region === r.id && ui.segmentActive)} aria-current={region === r.id ? 'page' : undefined}>{regionLabel(r.id, lang)}</Link>)}
      </nav>
      <nav className={cn(ui.segment, 'max-w-full flex-wrap')} aria-label={t.stageNav}>
        <Link href={href({ stage: '' })} className={cn(ui.segmentItem, !stage && ui.segmentActive)} aria-current={!stage ? 'page' : undefined}>{t.everyStage}</Link>
        {USE_STAGES.map((s) => <Link key={s} href={href({ stage: s })} className={cn(ui.segmentItem, 'inline-flex items-center gap-1.5', stage === s && ui.segmentActive)} aria-current={stage === s ? 'page' : undefined}><StageDot stage={s} />{useStageLabel(s, lang)}</Link>)}
      </nav>
      {country ? <Link href={href({ country: '' })} className="inline-flex items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-sm text-background" aria-label={t.removeCountry(countryName(country, lang))}><CountryFlag code={country} />{countryName(country, lang)}<span aria-hidden>×</span></Link> : null}
      <span className="label ml-auto px-2">{t.shownCount(shown.length, filtered)}</span>
    </div>

    {!shown.length ? <div className="card mt-6 px-6 py-12 text-center text-muted">{t.noMatch} <Link href="/use-cases" className="underline underline-offset-4">{t.showAll}</Link></div> : <>
      <section className="card mt-6 overflow-hidden" aria-labelledby="map-title">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pb-1 pt-4">
          <h2 id="map-title" className="text-lg font-semibold tracking-tight">{t.mapTitle}</h2>
          <span className="text-xs text-muted">{t.mapCount(map.points.length, map.countries.length, map.unplaced)}</span>
        </header>
        <UseMap points={map.points} active={new Set(map.countries.map((c) => c.code))} selected={country} href={(code) => href({ country: code, region: '' })} lang={lang} />
        <div className="flex flex-wrap gap-2 border-t border-edge/70 p-4" aria-label={t.countryFilter}>
          {map.countries.map((c) => <Link key={c.code} href={href({ country: c.code === country ? '' : c.code, region: '' })} aria-current={c.code === country ? 'page' : undefined}
            className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition hover:border-edge-strong', c.code === country ? 'border-foreground bg-foreground text-background' : 'border-edge text-muted')}>
            <CountryFlag code={c.code} />{c.name}<span className="num">{nf(c.count)}</span>
          </Link>)}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="settings-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="settings-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.settingsTitle(tiles.length)}</h2>
            <p className="mt-1 text-sm text-muted">{t.settingsLead}</p>
          </div>
        </div>
        <SettingTiles tiles={tiles} base={only ? href({ setting: '' }, '').slice(0, -1) : ''} lang={lang} />
      </section>

      {top.length > 1 ? <section className="mt-14" aria-labelledby="top-title">
        <h2 id="top-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.topTitle}</h2>
        <p className="mb-5 mt-1 text-sm text-muted">{t.topLead}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{top.map((group, i) => <RobotUseCard key={group.robotId} group={group} rank={i + 1} lang={lang} />)}</div>
      </section> : null}

      <div className="mt-6 space-y-16">
        {sections.map((s) => <section key={s.id} id={s.id} className="scroll-mt-20 pt-8" aria-labelledby={s.id + '-title'}>
          <header className="mb-5 grid grid-cols-1 items-end gap-4 border-t border-edge pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
            <div>
              <h2 id={s.id + '-title'} className="text-2xl font-semibold tracking-tight sm:text-3xl">{s.label}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">{s.intro}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm"><span className="num text-2xl font-semibold">{nf(s.uses.length)}</span> <span className="text-muted">{t.usesBy(s.uses.length)}</span> <span className="num font-semibold">{nf(s.groups.length)}</span> <span className="text-muted">{t.robotWord(s.groups.length)}</span></p>
              <StageBar stages={s.stages} lang={lang} />
            </div>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{(only ? s.groups : s.groups.slice(0, FIRST)).map((group) => <RobotUseCard key={group.robotId} group={group} lang={lang} />)}</div>
          {!only && s.groups.length > FIRST ? <p className="mt-4"><Link href={href({ setting: s.id }, s.id)} className={ui.btnSecondary}>{t.showAllFor(s.groups.length, s.label)}</Link></p> : null}
          {only ? <p className="mt-4"><Link href={href({ setting: '' }, s.id)} className={ui.btnSecondary}>{t.backToAll}</Link></p> : null}
        </section>)}
      </div>
    </>}
  </main>;
}
