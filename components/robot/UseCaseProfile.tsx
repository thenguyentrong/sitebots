import Link from 'next/link';
import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import { Badge } from '@/components/ui/badge';
import type { Profile } from '@/lib/profile/profile';
import type { ProfileFact } from '@/lib/profile/evidence';
import type { Dossier } from '@/lib/market/schema';
import { ProfileToggle } from './ProfileToggle';
import { RadarChart } from './RadarChart';
import { ConfigurationEvidence } from './ConfigurationEvidence';

const TASK_VARIANT = { yes: 'success', partial: 'warn', no: 'outline', unknown: 'neutral' } as const;
const pct = (value: number | null) => value === null ? null : Math.round(value * 100);

function Fact({ fact }: { fact: ProfileFact }) {
  return <div className="space-y-1 border-l-2 border-edge pl-3 text-xs">
    <p><span className="text-muted">{fact.label}: </span><strong className="font-medium">{fact.value}</strong></p>
    <div className="flex flex-wrap items-center gap-2"><EvidenceBadge trust={fact.trust} />{fact.sourceUrl ? <a href={fact.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Source ↗</a> : <span className="text-muted">Source link missing</span>}{fact.checkedAt ? <span className="text-muted">Recorded <time dateTime={fact.checkedAt}>{fact.checkedAt.slice(0, 10)}</time></span> : null}</div>
    {fact.note ? <p className="leading-relaxed text-muted">{fact.note}</p> : null}
  </div>;
}

export function UseCaseProfile({ profile, name, collapsed = false, marketRobots = [], configurationLabel = 'Catalogue model' }: { profile: Profile; name: string; collapsed?: boolean; marketRobots?: Dossier[]; configurationLabel?: string }) {
  const summary = profile.evidenceSummary;
  const site = <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
    <div>
      <RadarChart axes={profile.axes.map(a => ({ id: a.id, label: a.label }))} series={[{ name, values: profile.radar.site, tone: 0 }]} title={`${name}: site-condition profile`} desc={profile.axes.map(a => `${a.label}: ${a.coverage ? `${a.coverage.supported} supported, ${a.coverage.reported} reported, ${a.coverage.unknown} unconfirmed` : a.score === null ? 'unconfirmed' : `${pct(a.score)} of 100`}`).join(', ')} className="mx-auto max-w-full" />
      <p className="mt-2 text-xs leading-relaxed text-muted">Chart gaps mean evidence is missing. Scores describe the published data against fixed thresholds; they do not predict task success.</p>
    </div>
    <ol className="divide-y divide-edge/60 text-sm">{profile.axes.map(a => <li key={a.id}>
      <details data-profile-axis={a.id}>
        <summary className="cursor-pointer py-3 marker:text-muted">
          <span className="inline-flex max-w-full flex-wrap items-center gap-2"><span className="font-medium">{a.label}</span>{a.coverage ? <Badge variant={a.coverage.unknown || a.coverage.reported ? 'warn' : 'ink'}>{a.coverage.supported}/{a.coverage.total} supported</Badge> : a.score === null ? <Badge variant="neutral">unconfirmed</Badge> : <Badge variant={a.status === 'partial' ? 'warn' : 'ink'}>{pct(a.score)}/100</Badge>}</span>
          <span className="mt-1 block text-xs text-muted">{a.basis}{a.status === 'partial' ? ' · incomplete evidence' : ''}</span>
          <span className="mt-1 block text-xs text-muted">{a.evidence.facts.length} recorded field{a.evidence.facts.length === 1 ? '' : 's'} · {a.evidence.missing.length} follow-up{a.evidence.missing.length === 1 ? '' : 's'}</span>
        </summary>
        <div className="space-y-3 pb-4 pl-2">
          <p className="text-xs leading-relaxed text-muted">{a.hint}</p>
          {a.evidence.facts.map(fact => <Fact key={fact.key} fact={fact} />)}
          {a.id === 'evidence' ? <p className="text-xs text-muted">{summary.verified} manufacturer-sourced · {summary.assessed} assessed · {summary.reported} reported · {summary.unknown} with confidence unconfirmed. {summary.sources} distinct source links.</p> : !a.evidence.facts.length ? <p className="text-xs text-muted">No supporting catalogue specification is recorded for this axis.</p> : null}
          {a.evidence.missing.length ? <div className="rounded-lg bg-subtle p-3 text-xs"><p className="font-medium">Still needed</p><ul className="mt-1 list-disc space-y-1 pl-4 text-muted">{a.evidence.missing.map(item => <li key={item}>{item}</li>)}</ul></div> : null}
          <p className="text-xs leading-relaxed"><span className="font-medium">Ask before use: </span>{a.evidence.question}</p>
        </div>
      </details>
    </li>)}</ol>
  </div>;
  const tasks = <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
    <div><RadarChart axes={profile.tasks.map(t => ({ id: t.id, label: t.label.replace('Navigate ', '').replace(' alone', '') }))} series={[{ name, values: profile.radar.tasks, tone: 1 }]} title={`${name}: site tasks`} desc={profile.tasks.map(t => `${t.label}: ${t.wording}`).join(', ')} className="mx-auto max-w-full" /><p className="mt-2 text-xs leading-relaxed text-muted">A named task is a sourced capability claim. A task not listed remains unconfirmed.</p></div>
    <div className="space-y-4">
      {profile.taskSource ? <Fact fact={profile.taskSource} /> : <p className="rounded-lg bg-subtle p-3 text-xs text-muted">No field-level task evidence is recorded. Task, configuration, source and operating conditions are needed.</p>}
      {profile.buckets.map(b => <div key={b.id}><h3 className="label mb-2">{b.label}</h3><ul className="space-y-2">{b.tasks.map(t => <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{t.label}</span><Badge variant={TASK_VARIANT[t.status]}>{t.wording}</Badge></li>)}</ul></div>)}
    </div>
  </div>;
  const known = profile.axes.filter(a => a.coverage ? a.coverage.supported > 0 : a.score !== null).length;
  const title = <h2 className="text-sm font-semibold">Robot evidence profile</h2>;
  const meta = <span className="flex flex-wrap items-center gap-2 text-xs text-muted">{known} of {profile.axes.length} axes with data · tasks <EvidenceBadge trust={profile.taskTrust} /></span>;
  const body = <>
    <div className="space-y-3 border-b border-edge/70 bg-subtle/30 px-5 py-4">
      <p className="text-xs leading-relaxed text-muted"><strong className="font-medium text-foreground">Profile scope: {configurationLabel}.</strong> {marketRobots.length ? 'The chart uses this catalogue record. Configuration-specific findings are listed separately below.' : 'Expand an axis to see its sources, conditions and missing evidence.'}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs"><span><strong>{summary.published}</strong> populated fields</span><span><strong>{summary.verified}</strong> manufacturer-sourced</span><span><strong>{summary.assessed}</strong> assessed</span><span><strong>{summary.reported}</strong> reported</span><span><strong>{summary.sources}</strong> source links</span>{summary.latest ? <span className="text-muted">Latest record <time dateTime={summary.latest}>{summary.latest.slice(0, 10)}</time></span> : null}</div>
    </div>
    <div className="px-5 py-4"><ProfileToggle site={site} tasks={tasks} /></div>
    {marketRobots.length ? <div className="border-t border-edge/70 px-5 py-5"><ConfigurationEvidence robots={marketRobots} /></div> : null}
    <p className="border-t border-edge/70 bg-subtle/40 px-5 py-2.5 text-xs leading-relaxed text-muted">Unweighted thresholds use the matcher&apos;s rules. Handling shows evidence coverage. Source labels describe provenance and do not certify performance. <Link href="/methodology#profile" className="underline underline-offset-2 hover:text-foreground">How the axes are built</Link></p>
  </>;
  if (collapsed) return <details className="card group overflow-hidden" data-profile><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">{title}<span className="flex flex-wrap items-center gap-3">{meta}<span className="text-xs underline group-open:hidden">Show</span><span className="hidden text-xs underline group-open:inline">Hide</span></span></summary><div className="border-t border-edge/70">{body}</div></details>;
  return <section className="card overflow-hidden" data-profile><header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">{title}{meta}</header>{body}</section>;
}
