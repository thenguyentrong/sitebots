import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/journey/Icon';
import { Steps } from '@/components/journey/Steps';
import { TaskCheck } from '@/components/journey/TaskCheck';
import { VerdictBadge } from '@/components/journey/VerdictBadge';
import { loadContent } from '@/lib/content/load';
import { factText } from '@/lib/journey/fact-text';
import { GROUP_LABELS, LV_UNIT_LABELS, lbLabel } from '@/lib/journey/labels';
import { publicMetadata } from '@/lib/seo';
import { FACT_LABELS, type Facts } from '@/lib/screen/facts';
import { complianceLabels, findTaskCard, journeyContent } from '@/lib/tasks/cards';
import type { RequirementEntry, TaskCard } from '@/lib/tasks/types';
import '../../../plan/plan.css';
import '../../../plan/journey.css';

export const dynamic = 'force-dynamic';
type Params = Promise<{ setting: string; task: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { setting, task } = await params;
  const card = findTaskCard(loadContent(), setting, task);
  if (!card) return { title: 'Use case not found' };
  return publicMetadata({ title: card.title.en, description: card.summary.en, path: `/use-cases/${setting}/${task}` });
}

type RequirementRow = { label: string; value: string; confidence: string; note: string; url?: string };
const range = (r: { min: number; max: number }, unit: string) => (r.min === r.max ? `${r.max.toLocaleString('en-GB')} ${unit}` : `${r.min.toLocaleString('en-GB')}–${r.max.toLocaleString('en-GB')} ${unit}`);

/** The requirement profile in reading order: object, place, precision, force, then the conditions the screen reads. */
function requirementRows(card: TaskCard, machines: Record<string, string>): RequirementRow[] {
  const fact = (key: keyof Facts, label = FACT_LABELS[key]): RequirementRow => ({ label, value: factText(key, card.facts, machines), confidence: card.meta[key]?.confidence ?? '', note: card.meta[key]?.note ?? '', url: card.meta[key]?.evidence_url });
  const req = <T,>(entry: RequirementEntry<T> | undefined, label: string, show: (v: T) => string): RequirementRow | null => entry ? { label, value: entry.value === null ? 'Not established' : show(entry.value), confidence: entry.confidence, note: entry.note, url: entry.evidence_url } : null;
  const r = card.requirements;
  return [
    fact('object_mass_kg'),
    req(r?.object_size_m, 'Largest object dimension', (v) => range(v, 'm')),
    fact('reach_height_m'),
    req(r?.tolerance_mm, 'Tolerance the result must meet', (v) => `±${v.toLocaleString('en-GB')} mm`),
    req(r?.force_n, 'Force the work takes', (v) => `${v.toLocaleString('en-GB')} N`),
    ...(['variability', 'error_tolerance', 'safety_criticality', 'environment', 'dust', 'wet', 'floor', 'incumbent_automation', 'data_sensitivity', 'runtime_continuous_min'] as const).map((key) => fact(key)),
  ].filter((row): row is RequirementRow => row !== null);
}

/** One library task: the check for the visitor's own site first, then the record in full with every source. */
export default async function UseCasePage({ params }: { params: Params }) {
  const { setting, task } = await params;
  const content = loadContent();
  const card = findTaskCard(content, setting, task);
  if (!card) notFound();
  const journey = journeyContent(content);
  const settings = Object.fromEntries(journey.settings.map((s) => [s.id, s.title.en]));
  const home = journey.settings.find((s) => s.id === card.setting);
  const lb = card.lv?.lb ?? null;
  const compliance = complianceLabels(content);
  const metrics = Object.fromEntries(content.pilotMetrics.map((m) => [m.id, m.label.en]));
  const machines = Object.fromEntries(journey.machineClasses.map((m) => [m.id, m.title.en]));
  return <main className="jp-page plan-page">
    <Steps />
    <nav className="jp-muted pt-8" aria-label="Breadcrumb"><Link className="jp-link" href="/use-cases">Use cases</Link>{home ? <> / <Link className="jp-link" href={'/use-cases?group=' + home.group}>{GROUP_LABELS[home.group]}</Link></> : null} / <Link className="jp-link" href={'/use-cases?setting=' + card.setting}>{lbLabel(home?.lv?.lb) ? lbLabel(home?.lv?.lb) + ' ' : ''}{settings[card.setting] ?? card.setting}</Link></nav>
    <header className="jp-head" style={{ paddingTop: 24 }}>
      <div className="flex flex-wrap items-center gap-3"><VerdictBadge verdict={card.reference_verdict} reference /><span className="jp-muted inline-flex items-center gap-2"><Icon name={card.family} size={16} />{journey.families[card.family]?.en ?? card.family}</span></div>
      <h1 className="max-w-4xl">{card.title.en}</h1>
      <p className="jp-lede">{card.summary.en}</p>
      <p className="jp-small mt-4">Screened for {settings[card.setting] ?? card.setting}, sources reviewed {card.sources_reviewed_at}. <Link className="jp-link" href="/use-cases/criteria">How tasks are screened</Link></p>
    </header>
    <div className="jp-body">
      <TaskCheck card={card} group={home?.group ?? 'site'} machineClasses={journey.machineClasses} machineClassFamilies={journey.machineClassFamilies} solutionClasses={journey.solutionClasses} />
      <section className="jp-section" aria-labelledby="about"><h2 id="about">About the task</h2>
        <div className="flex flex-col gap-6">
          {card.lv ? <dl className="lv-anchor">
            <div><dt>In the LV</dt><dd>{card.lv.position.en}<span className="jp-small mt-1 block">{card.lv.position.de}</span></dd></div>
            <div><dt>Leistungsbereich</dt><dd>{lb ? `LB ${lb} ${home?.title.de ?? ''}` : 'Outside the LV'}</dd></div>
            <div><dt>Trade standard</dt><dd>{card.lv.atv ? `ATV ${card.lv.atv}` : 'None'}</dd></div>
            <div><dt>Unit</dt><dd>{LV_UNIT_LABELS[card.lv.unit]}</dd></div>
          </dl> : null}
          <p className="jp-text max-w-3xl">{card.description.en}</p>
          {card.solution_classes.length ? <p className="jp-text"><span className="font-medium">Solution classes to compare: </span>{card.solution_classes.map((c) => journey.solutionClasses[c]?.en ?? c).join(', ')}</p> : null}
        </div>
      </section>
      <section className="jp-section" aria-labelledby="facts"><div className="jp-section-head"><h2 id="facts">Requirement profile</h2><p>What the task demands of whoever does it, each value with its source. <Link className="jp-link text-foreground" href="/use-cases/criteria">Criteria</Link></p></div>
        <dl className="requirement-list is-columns">{requirementRows(card, machines).map((row) => <div key={row.label}>
          <dt><span>{row.label}</span><span className="jp-small">{row.confidence}</span></dt>
          <dd className="jp-text">{row.value}</dd>
          {row.note || row.url ? <dd className="jp-small">{row.note}{row.url ? <> <a className="jp-link" href={row.url} target="_blank" rel="noopener noreferrer">Source: {new URL(row.url).hostname}</a></> : null}</dd> : null}
        </div>)}</dl>
      </section>
      <div className="grid gap-8 md:grid-cols-2 md:items-start md:gap-12">
        <section className="jp-section" aria-labelledby="evidence"><h2 id="evidence">Evidence</h2>
          {card.evidence.length ? <ul className="flex flex-col gap-4">{card.evidence.map((e) => <li key={e.url}><p className="jp-text">{e.statement.en}</p><p className="jp-small mt-1"><a className="jp-link" href={e.url} target="_blank" rel="noopener noreferrer">{new URL(e.url).hostname}</a>, {e.kind}, {e.type}, {e.date}, tier {e.tier}</p>{e.note ? <p className="jp-small mt-1">{e.note}</p> : null}</li>)}</ul> : <p className="jp-muted">No humanoid precedent is claimed for this task; the verdict rests on the requirement profile above.</p>}
        </section>
        <section className="jp-section" aria-labelledby="pilot"><h2 id="pilot">Pilot</h2>
          <div className="flex flex-col gap-3 jp-text">
            <p><span className="font-medium">Scope: </span>{card.pilot.scope_hint.en}</p>
            <p><span className="font-medium">Abort rule: </span>{card.pilot.abort_rule.en}</p>
            {card.pilot.metrics.length ? <p><span className="font-medium">Measure: </span>{card.pilot.metrics.map((m) => metrics[m] ?? m).join(', ')}</p> : null}
            {card.prerequisites.length ? <div><h3 className="font-semibold">Prerequisites</h3><ul className="mt-1 list-disc pl-5">{card.prerequisites.map((p) => <li key={p.en}>{p.en}</li>)}</ul></div> : null}
            {card.open_questions.length ? <div><h3 className="font-semibold">Open questions</h3><ul className="mt-1 list-disc pl-5">{card.open_questions.map((q) => <li key={q.en}>{q.en}</li>)}</ul></div> : null}
            {card.compliance_flags.length ? <p className="jp-small">Compliance to check: {card.compliance_flags.map((f) => compliance[f]?.en ?? f).join(', ')}</p> : null}
          </div>
        </section>
      </div>
      {card.also_in_settings.length ? <p className="jp-muted">Object facts may transfer to: {card.also_in_settings.map((s, i) => <span key={s}>{i ? ', ' : ''}<Link className="jp-link text-foreground" href={'/use-cases?setting=' + s}>{settings[s] ?? s}</Link></span>)}. The site conditions never transfer; you answer them in the check.</p> : null}
    </div>
  </main>;
}
