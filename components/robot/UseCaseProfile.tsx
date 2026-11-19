import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import { Badge } from '@/components/ui/badge';
import { recordLang, type Lang } from '@/lib/i18n/config';
import { PROFILE_TEXT, recordDay } from '@/lib/i18n/robot';
import type { Profile } from '@/lib/profile/profile';
import type { ProfileFact } from '@/lib/profile/evidence';
import { taskShortLabel } from '@/lib/profile/tasks';
import type { Dossier } from '@/lib/market/schema';
import { ProfileToggle } from './ProfileToggle';
import { RadarChart } from './RadarChart';
import { ConfigurationEvidence } from './ConfigurationEvidence';

const TASK_VARIANT = { yes: 'success', partial: 'warn', no: 'outline', unknown: 'neutral' } as const;
const pct = (value: number | null) => value === null ? null : Math.round(value * 100);
/** Axes whose basis line we write; the others quote the matcher's criteria, which speak English for now. */
const OWN_BASIS = new Set(['manipulation', 'speed', 'evidence']);

function Fact({ fact, lang }: { fact: ProfileFact; lang: Lang }) {
  const t = PROFILE_TEXT[lang];
  return <div className="space-y-1 border-l-2 border-edge pl-3 text-xs">
    <p><span className="text-muted">{fact.label}: </span><strong className="font-medium">{fact.value}</strong></p>
    <div className="flex flex-wrap items-center gap-2"><EvidenceBadge trust={fact.trust} lang={lang} />{fact.sourceUrl ? <a href={fact.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{t.source}</a> : <span className="text-muted">{t.noSource}</span>}{fact.checkedAt ? <span className="text-muted">{t.recorded} <time dateTime={fact.checkedAt}>{recordDay(fact.checkedAt.slice(0, 10), lang)}</time></span> : null}</div>
    {fact.note ? <p className="leading-relaxed text-muted" lang={recordLang(lang)}>{fact.note}</p> : null}
  </div>;
}

export function UseCaseProfile({ profile, name, collapsed = false, marketRobots = [], configurationLabel, lang = 'en' }: { profile: Profile; name: string; collapsed?: boolean; marketRobots?: Dossier[]; configurationLabel?: string; lang?: Lang }) {
  const t = PROFILE_TEXT[lang];
  const scope = configurationLabel ?? (lang === 'de' ? 'Katalogmodell' : 'Catalogue model');
  const summary = profile.evidenceSummary;
  const site = <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
    <div>
      <RadarChart axes={profile.axes.map(a => ({ id: a.id, label: a.label }))} series={[{ name, values: profile.radar.site, tone: 0 }]} title={t.siteTitle(name)} desc={profile.axes.map(a => a.coverage ? t.axisDesc(a.label, a.coverage.supported, a.coverage.reported, a.coverage.unknown) : `${a.label}: ${a.score === null ? t.unconfirmed : t.ofHundred(pct(a.score))}`).join(', ')} className="mx-auto max-w-full" />
      <p className="mt-2 text-xs leading-relaxed text-muted">{t.chartNote}</p>
    </div>
    <ol className="divide-y divide-edge/60 text-sm">{profile.axes.map(a => <li key={a.id}>
      <details data-profile-axis={a.id}>
        <summary className="cursor-pointer py-3 marker:text-muted">
          <span className="inline-flex max-w-full flex-wrap items-center gap-2"><span className="font-medium">{a.label}</span>{a.coverage ? <Badge variant={a.coverage.unknown || a.coverage.reported ? 'warn' : 'ink'}>{t.supported(a.coverage.supported, a.coverage.total)}</Badge> : a.score === null ? <Badge variant="neutral">{t.unconfirmed}</Badge> : <Badge variant={a.status === 'partial' ? 'warn' : 'ink'}>{pct(a.score)}/100</Badge>}</span>
          <span className="mt-1 block text-xs text-muted"><span lang={OWN_BASIS.has(a.id) ? undefined : recordLang(lang)}>{a.basis}</span>{a.status === 'partial' ? t.incomplete : ''}</span>
          <span className="mt-1 block text-xs text-muted">{t.counts(a.evidence.facts.length, a.evidence.missing.length)}</span>
        </summary>
        <div className="space-y-3 pb-4 pl-2">
          <p className="text-xs leading-relaxed text-muted">{a.hint}</p>
          {a.evidence.facts.map(fact => <Fact key={fact.key} fact={fact} lang={lang} />)}
          {a.id === 'evidence' ? <p className="text-xs text-muted">{t.evidenceLine(summary.verified, summary.assessed, summary.reported, summary.unknown, summary.sources)}</p> : !a.evidence.facts.length ? <p className="text-xs text-muted">{t.noAxisSpec}</p> : null}
          {a.evidence.missing.length ? <div className="rounded-lg bg-subtle p-3 text-xs"><p className="font-medium">{t.stillNeeded}</p><ul className="mt-1 list-disc space-y-1 pl-4 text-muted">{a.evidence.missing.map(item => <li key={item}>{item}</li>)}</ul></div> : null}
          <p className="text-xs leading-relaxed"><span className="font-medium">{t.ask}</span>{a.evidence.question}</p>
        </div>
      </details>
    </li>)}</ol>
  </div>;
  const tasks = <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
    <div><RadarChart axes={profile.tasks.map(task => ({ id: task.id, label: taskShortLabel(task.id, lang) }))} series={[{ name, values: profile.radar.tasks, tone: 1 }]} title={t.tasksTitle(name)} desc={profile.tasks.map(task => `${task.label}: ${task.wording}`).join(', ')} className="mx-auto max-w-full" /><p className="mt-2 text-xs leading-relaxed text-muted">{t.tasksNote}</p></div>
    <div className="space-y-4">
      {profile.taskSource ? <Fact fact={profile.taskSource} lang={lang} /> : <p className="rounded-lg bg-subtle p-3 text-xs text-muted">{t.noTaskEvidence}</p>}
      {profile.buckets.map(b => <div key={b.id}><h3 className="label mb-2">{b.label}</h3><ul className="space-y-2">{b.tasks.map(task => <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{task.label}</span><Badge variant={TASK_VARIANT[task.status]}>{task.wording}</Badge></li>)}</ul></div>)}
    </div>
  </div>;
  const known = profile.axes.filter(a => a.coverage ? a.coverage.supported > 0 : a.score !== null).length;
  const title = <h2 className="text-sm font-semibold">{t.title}</h2>;
  const meta = <span className="flex flex-wrap items-center gap-2 text-xs text-muted">{t.axesWithData(known, profile.axes.length)} <EvidenceBadge trust={profile.taskTrust} lang={lang} /></span>;
  const body = <>
    <div className="space-y-3 border-b border-edge/70 bg-subtle/30 px-5 py-4">
      <p className="text-xs leading-relaxed text-muted"><strong className="font-medium text-foreground">{t.scope(scope)}</strong> {marketRobots.length ? t.scopeMarket : t.scopeExpand}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs"><span><strong>{summary.published}</strong> {t.populated}</span><span><strong>{summary.verified}</strong> {t.makerSourced}</span><span><strong>{summary.assessed}</strong> {t.assessed}</span><span><strong>{summary.reported}</strong> {t.reported}</span><span><strong>{summary.sources}</strong> {t.sourceLinks}</span>{summary.latest ? <span className="text-muted">{t.latest} <time dateTime={summary.latest}>{recordDay(summary.latest.slice(0, 10), lang)}</time></span> : null}</div>
    </div>
    <div className="px-5 py-4"><ProfileToggle site={site} tasks={tasks} /></div>
    {marketRobots.length ? <div className="border-t border-edge/70 px-5 py-5"><ConfigurationEvidence robots={marketRobots} lang={lang} /></div> : null}
    <p className="border-t border-edge/70 bg-subtle/40 px-5 py-2.5 text-xs leading-relaxed text-muted">{t.footer}</p>
  </>;
  if (collapsed) return <details className="card group overflow-hidden" data-profile><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">{title}<span className="flex flex-wrap items-center gap-3">{meta}<span className="text-xs underline group-open:hidden">{t.show}</span><span className="hidden text-xs underline group-open:inline">{t.hide}</span></span></summary><div className="border-t border-edge/70">{body}</div></details>;
  return <section className="card overflow-hidden" data-profile><header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">{title}{meta}</header>{body}</section>;
}
