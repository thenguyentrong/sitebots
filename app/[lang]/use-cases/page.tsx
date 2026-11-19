import Link from '@/components/LocaleLink';
import { RobotUseCard } from '@/components/use-cases/RobotUseCard';
import { SettingTiles } from '@/components/use-cases/SettingTiles';
import { UseMap } from '@/components/use-cases/UseMap';
import { CountryFlag, StageBar, StageDot, StageLegend } from '@/components/use-cases/parts';
import { groupByRobot, settingTiles, stageCounts, usePoints } from '@/lib/market/use-case-views';
import { REGIONS, SETTINGS, STAGE_LABEL, USE_STAGES, countryName, loadUseCases, useCaseStats, type RegionId, type UseStage } from '@/lib/market/use-cases';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

export const metadata = publicMetadata({
  title: 'Where construction robots already work',
  description: 'Every documented use of a construction or general-purpose robot we track: daily use, pilots and demonstrations by setting, country and robot, each with its source.',
  path: '/use-cases',
});

type Search = Promise<{ region?: string; stage?: string; country?: string; setting?: string }>;
const nf = new Intl.NumberFormat('en-GB');
// Each kind of work shows its first cards; its own view (?setting=) shows them all, so the page stays light.
const FIRST = 6;

function BigNumber({ value, label, hint }: { value: number; label: string; hint?: string }) {
  return <div>
    <div className="num text-4xl font-semibold leading-none tracking-tight sm:text-5xl">{nf.format(value)}</div>
    <div className="mt-2 text-sm font-medium">{label}</div>
    {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
  </div>;
}

export default async function UseCasesPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const all = loadUseCases();
  const stats = useCaseStats(all);
  const region = REGIONS.some((r) => r.id === sp.region) ? sp.region as RegionId : undefined;
  const stage = (USE_STAGES as readonly string[]).includes(String(sp.stage)) ? sp.stage as UseStage : undefined;
  const country = /^[A-Z]{2}$/.test(String(sp.country)) && all.some((use) => use.countries.includes(sp.country!)) ? sp.country : undefined;
  const shown = all.filter((use) => (!region || use.region === region) && (!stage || use.stage === stage) && (!country || use.countries.includes(country)));

  const only = SETTINGS.some((s) => s.id === sp.setting) ? sp.setting : undefined;
  const href = (next: { region?: string; stage?: string; country?: string; setting?: string }, hash = 'explore') => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ region, stage, country, setting: only, ...next })) if (v) q.set(k, v);
    const s = q.toString();
    return '/use-cases' + (s ? '?' + s : '') + '#' + hash;
  };
  const map = usePoints(shown);
  const tiles = settingTiles(shown);
  const top = groupByRobot(shown).slice(0, 4);
  // Each robot card takes a photo no other card on the page shows yet, where the robot has more than one.
  const seen = new Set(top.flatMap((group) => group.picture ? [group.picture.src] : []));
  const sections = SETTINGS.map((s) => ({ ...s, uses: shown.filter((use) => use.setting === s.id) })).filter((s) => s.uses.length && (!only || s.id === only))
    .sort((a, b) => b.uses.length - a.uses.length)
    .map((s) => ({ ...s, groups: groupByRobot(s.uses, seen), stages: stageCounts(s.uses) }));
  const filtered = Boolean(region || stage || country);

  return <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
    <header className="grid grid-cols-1 items-end gap-10 pb-10 pt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div>
        <p className="label">Use cases</p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Where robots already work</h1>
        <p className="mt-5 max-w-xl text-base text-muted">German building sites, tunnels in Sweden, towers in Tokyo, solar parks in Texas. Every job here was shown on a real project or in a demonstration, and links to the page it was read from.</p>
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-7">
          <BigNumber value={stats.total} label="Documented uses" hint="each with a source" />
          <BigNumber value={stats.byStage.deployment} label="In daily use" hint="on real projects" />
          <BigNumber value={stats.robots} label="Robots" hint={`from ${stats.makers} makers`} />
          <BigNumber value={stats.countries} label="Countries" hint="named in the sources" />
        </div>
        <div className="space-y-2">
          <StageBar stages={stats.byStage} className="h-3" />
          <StageLegend />
          <p className="text-xs text-faint">{nf.format(stats.claims)} more maker claims name a job but show no project. They are not counted.</p>
        </div>
      </div>
    </header>

    <div id="explore" className="card flex scroll-mt-20 flex-wrap items-center gap-3 p-2">
      <nav className={cn(ui.segment, 'max-w-full flex-wrap')} aria-label="Region">
        <Link href={href({ region: '', country: '' })} className={cn(ui.segmentItem, !region && !country && ui.segmentActive)} aria-current={!region && !country ? 'page' : undefined}>Worldwide</Link>
        {REGIONS.filter((r) => r.id !== 'NONE' && stats.byRegion.find((x) => x.id === r.id)?.count).map((r) => <Link key={r.id} href={href({ region: r.id, country: '' })} className={cn(ui.segmentItem, region === r.id && ui.segmentActive)} aria-current={region === r.id ? 'page' : undefined}>{r.label}</Link>)}
      </nav>
      <nav className={cn(ui.segment, 'max-w-full flex-wrap')} aria-label="How far">
        <Link href={href({ stage: '' })} className={cn(ui.segmentItem, !stage && ui.segmentActive)} aria-current={!stage ? 'page' : undefined}>Every stage</Link>
        {USE_STAGES.map((s) => <Link key={s} href={href({ stage: s })} className={cn(ui.segmentItem, 'inline-flex items-center gap-1.5', stage === s && ui.segmentActive)} aria-current={stage === s ? 'page' : undefined}><StageDot stage={s} />{STAGE_LABEL[s]}</Link>)}
      </nav>
      {country ? <Link href={href({ country: '' })} className="inline-flex items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-sm text-background" aria-label={`Remove the ${countryName(country)} filter`}><CountryFlag code={country} />{countryName(country)}<span aria-hidden>×</span></Link> : null}
      <span className="label ml-auto px-2">{nf.format(shown.length)} uses{filtered ? ' shown' : ''}</span>
    </div>

    {!shown.length ? <div className="card mt-6 px-6 py-12 text-center text-muted">No documented use matches this filter. <Link href="/use-cases" className="underline underline-offset-4">Show all</Link></div> : <>
      <section className="card mt-6 overflow-hidden" aria-labelledby="map-title">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pb-1 pt-4">
          <h2 id="map-title" className="text-lg font-semibold tracking-tight">On the map</h2>
          <span className="text-xs text-muted">{map.points.length} places in {map.countries.length} countries{map.unplaced ? ` · ${map.unplaced} uses name no place` : ''}</span>
        </header>
        <UseMap points={map.points} active={new Set(map.countries.map((c) => c.code))} selected={country} href={(code) => href({ country: code, region: '' })} />
        <div className="flex flex-wrap gap-2 border-t border-edge/70 p-4" aria-label="Filter by country">
          {map.countries.map((c) => <Link key={c.code} href={href({ country: c.code === country ? '' : c.code, region: '' })} aria-current={c.code === country ? 'page' : undefined}
            className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition hover:border-edge-strong', c.code === country ? 'border-foreground bg-foreground text-background' : 'border-edge text-muted')}>
            <CountryFlag code={c.code} />{c.name}<span className="num">{c.count}</span>
          </Link>)}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="settings-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="settings-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{tiles.length} kinds of work</h2>
            <p className="mt-1 text-sm text-muted">Sorted by the number of uses. Pick one to see its robots.</p>
          </div>
        </div>
        <SettingTiles tiles={tiles} base={only ? href({ setting: '' }, '').slice(0, -1) : ''} />
      </section>

      {top.length > 1 ? <section className="mt-14" aria-labelledby="top-title">
        <h2 id="top-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">The most proven robots</h2>
        <p className="mb-5 mt-1 text-sm text-muted">Most days in real use first, then the most projects and demonstrations.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{top.map((group, i) => <RobotUseCard key={group.robotId} group={group} rank={i + 1} />)}</div>
      </section> : null}

      <div className="mt-6 space-y-16">
        {sections.map((s) => <section key={s.id} id={s.id} className="scroll-mt-20 pt-8" aria-labelledby={s.id + '-title'}>
          <header className="mb-5 grid grid-cols-1 items-end gap-4 border-t border-edge pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
            <div>
              <h2 id={s.id + '-title'} className="text-2xl font-semibold tracking-tight sm:text-3xl">{s.label}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">{s.intro}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm"><span className="num text-2xl font-semibold">{s.uses.length}</span> <span className="text-muted">uses by</span> <span className="num font-semibold">{s.groups.length}</span> <span className="text-muted">robot{s.groups.length === 1 ? '' : 's'}</span></p>
              <StageBar stages={s.stages} />
            </div>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{(only ? s.groups : s.groups.slice(0, FIRST)).map((group) => <RobotUseCard key={group.robotId} group={group} />)}</div>
          {!only && s.groups.length > FIRST ? <p className="mt-4"><Link href={href({ setting: s.id }, s.id)} className={ui.btnSecondary}>Show all {s.groups.length} robots for {s.label.toLowerCase()}</Link></p> : null}
          {only ? <p className="mt-4"><Link href={href({ setting: '' }, s.id)} className={ui.btnSecondary}>Back to every kind of work</Link></p> : null}
        </section>)}
      </div>
    </>}
  </main>;
}
