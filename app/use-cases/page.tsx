import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { REGIONS, SETTINGS, STAGE_LABEL, USE_STAGES, loadUseCases, useCaseStats, type RegionId, type UseCase, type UseStage } from '@/lib/market/use-cases';

export const metadata = publicMetadata({
  title: 'Where construction robots already work',
  description: 'Every documented use of a construction or general-purpose robot we track: daily use, pilots and demonstrations by setting, country and robot, each with its source.',
  path: '/use-cases',
});

type Search = Promise<{ region?: string; stage?: string }>;
const STAGE_VARIANT: Record<UseStage, 'success' | 'info' | 'neutral'> = { deployment: 'success', pilot: 'info', demo: 'neutral' };
const nf = new Intl.NumberFormat('en-GB');

function Stat({ value, label, hint }: { value: number; label: string; hint?: string }) {
  return <div className="bg-card px-5 py-4">
    <div className="num text-3xl font-semibold tracking-tight">{nf.format(value)}</div>
    <div className="mt-1 text-sm">{label}</div>
    {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
  </div>;
}

/** One measure per row, sorted, labelled at the bar: no legend needed for a single series. */
function Bars({ title, rows, unit }: { title: string; rows: { key: string; label: string; count: number; note?: string; href?: string }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return <section className="card overflow-hidden" aria-labelledby={'bars-' + title}>
    <header className="border-b border-edge/70 px-5 py-3.5"><h2 id={'bars-' + title} className="text-sm font-semibold">{title}</h2></header>
    <ul className="space-y-2.5 px-5 py-4">
      {rows.map((row) => {
        const label = <span className="leading-snug">{row.label}</span>;
        return <li key={row.key} className="grid grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm" title={`${row.label}: ${row.count} ${unit}${row.note ? ' · ' + row.note : ''}`}>
          {row.href ? <a href={row.href} className="leading-snug underline-offset-4 hover:underline">{row.label}</a> : label}
          <span className="h-2.5 rounded-r-[4px] bg-[var(--accent)]" style={{ width: `${Math.max(2, (row.count / max) * 100)}%` }} aria-hidden />
          <span className="num text-right text-xs text-muted">{row.count}{row.note ? <span className="ml-1 text-faint">· {row.note}</span> : null}</span>
        </li>;
      })}
    </ul>
  </section>;
}

function UseRow({ use }: { use: UseCase }) {
  return <li className="grid grid-cols-1 gap-x-4 gap-y-1 px-5 py-3 text-sm md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,12rem)_auto]">
    <div className="min-w-0">
      <Link href={use.href} className="font-medium underline-offset-4 hover:underline">{use.robot}</Link>
      <div className="truncate text-xs text-muted">{use.maker}</div>
    </div>
    <p className="min-w-0 text-muted">{use.task}</p>
    <div className="min-w-0 text-xs">
      <div className="text-foreground">{use.place || <span className="text-faint">Place not named</span>}</div>
      {use.where && use.where !== use.place ? <div className="line-clamp-2 text-faint">{use.where}</div> : null}
    </div>
    <div className="flex flex-wrap items-start gap-2 md:flex-col md:items-end">
      <Badge variant={STAGE_VARIANT[use.stage]}>{STAGE_LABEL[use.stage]}</Badge>
      <span className="flex items-center gap-2 text-xs text-faint">
        {use.date ? <span className="num">{use.date}</span> : null}
        {use.sourceUrl ? <a href={use.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Source ↗</a> : null}
      </span>
    </div>
  </li>;
}

export default async function UseCasesPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const region = REGIONS.some((r) => r.id === sp.region) ? sp.region as RegionId : undefined;
  const stage = (USE_STAGES as readonly string[]).includes(String(sp.stage)) ? sp.stage as UseStage : undefined;
  const all = loadUseCases();
  const stats = useCaseStats(all);
  const shown = all.filter((use) => (!region || use.region === region) && (!stage || use.stage === stage));
  const href = (next: { region?: string; stage?: string }) => {
    const q = new URLSearchParams();
    const merged = { region, stage, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return '/use-cases' + (s ? '?' + s : '') + '#uses';
  };

  return <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
    <header className="py-10">
      <p className="label">Use cases</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Where robots already work</h1>
      <p className="mt-3 max-w-3xl text-muted">Every documented job of the robots we track, from German building sites to tunnels in Sweden, towers in Tokyo and solar parks in Texas. Each line links to the page it was read from. Maker claims without a shown job are not counted.</p>
    </header>

    <section aria-label="Key numbers" className="card overflow-hidden">
      <div className="grid grid-cols-2 gap-px bg-edge/60 sm:grid-cols-3 lg:grid-cols-6">
        <Stat value={stats.total} label="Documented uses" hint="with a source" />
        <Stat value={stats.byStage.deployment} label="In daily use" hint="on real projects" />
        <Stat value={stats.byStage.pilot} label="Pilots" hint="on a real project" />
        <Stat value={stats.byStage.demo} label="Demonstrations" hint="shown working" />
        <Stat value={stats.robots} label="Robots" hint={`from ${stats.makers} makers`} />
        <Stat value={stats.countries} label="Countries" hint="named in the sources" />
      </div>
      <p className="border-t border-edge/70 px-5 py-2.5 text-xs text-muted">{nf.format(stats.claims)} more maker claims name a job but show no project; they are not in these numbers.</p>
    </section>

    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Bars title="By setting" unit="uses" rows={[...stats.bySetting].filter((s) => s.count).sort((a, b) => b.count - a.count).map((s) => ({ key: s.id, label: s.label, count: s.count, note: s.deployments + ' daily', href: '#' + s.id }))} />
      <Bars title="By region" unit="uses" rows={stats.byRegion.filter((r) => r.count).map((r) => ({ key: r.id, label: r.label, count: r.count, href: href({ region: r.id }) }))} />
      <Bars title="Countries with the most uses" unit="uses" rows={stats.topCountries.map((c) => ({ key: c.code, label: c.name, count: c.count }))} />
      <Bars title="Robots with the most documented uses" unit="uses" rows={stats.topRobots.map((r) => ({ key: r.robotId, label: r.robot, count: r.count, note: r.deployments + ' daily', href: r.href }))} />
    </div>

    <div id="uses" className="mt-10 flex scroll-mt-20 flex-wrap items-center gap-3">
      <nav className={cn(ui.segment, 'max-w-full flex-wrap')} aria-label="Region">
        <Link href={href({ region: '' })} className={cn(ui.segmentItem, !region && ui.segmentActive)} aria-current={!region ? 'page' : undefined}>All regions</Link>
        {REGIONS.filter((r) => stats.byRegion.find((x) => x.id === r.id)?.count).map((r) => <Link key={r.id} href={href({ region: r.id })} className={cn(ui.segmentItem, region === r.id && ui.segmentActive)} aria-current={region === r.id ? 'page' : undefined}>{r.label}</Link>)}
      </nav>
      <nav className={cn(ui.segment, 'max-w-full flex-wrap')} aria-label="How far">
        <Link href={href({ stage: '' })} className={cn(ui.segmentItem, !stage && ui.segmentActive)} aria-current={!stage ? 'page' : undefined}>All</Link>
        {USE_STAGES.map((s) => <Link key={s} href={href({ stage: s })} className={cn(ui.segmentItem, stage === s && ui.segmentActive)} aria-current={stage === s ? 'page' : undefined}>{STAGE_LABEL[s]}</Link>)}
      </nav>
      <span className="label ml-auto">{nf.format(shown.length)} shown</span>
    </div>

    <nav aria-label="Settings" className="mt-4 flex flex-wrap gap-2">
      {SETTINGS.map((s) => {
        const n = shown.filter((use) => use.setting === s.id).length;
        return n ? <a key={s.id} href={'#' + s.id} className="rounded-full border border-edge px-3 py-1.5 text-xs text-muted transition hover:border-edge-strong hover:text-foreground">{s.label} <span className="num ml-1">{n}</span></a> : null;
      })}
    </nav>

    <div className="mt-6 space-y-6">
      {SETTINGS.map((s) => {
        const uses = shown.filter((use) => use.setting === s.id);
        if (!uses.length) return null;
        const daily = uses.filter((use) => use.stage === 'deployment').length;
        return <section key={s.id} id={s.id} className="card scroll-mt-20 overflow-hidden" aria-labelledby={s.id + '-title'}>
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-edge/70 px-5 py-3.5">
            <div>
              <h2 id={s.id + '-title'} className="text-sm font-semibold">{s.label}</h2>
              <p className="mt-0.5 text-xs text-muted">{s.intro}</p>
            </div>
            <span className="num text-xs text-faint">{uses.length} uses · {daily} in daily use · {new Set(uses.map((use) => use.robotId)).size} robots</span>
          </header>
          <ul className="divide-y divide-edge/60">{uses.map((use) => <UseRow key={use.key} use={use} />)}</ul>
        </section>;
      })}
      {!shown.length ? <div className="card px-6 py-10 text-center text-muted">No documented use matches this filter. <Link href="/use-cases" className="underline underline-offset-4">Show all</Link></div> : null}
    </div>
  </main>;
}
