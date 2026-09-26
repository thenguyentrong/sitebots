'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { FAMILY_IDS, type FamilyId } from '@/lib/content/vocab';
import { jobForFamily } from '@/lib/plan/legacy';
import { newProject, type Project } from '@/lib/plan/model';
import { screenForSite } from '@/lib/plan/screen';
import { PROJECT_LIMIT, usePlan } from '@/lib/plan/store';
import { emptyFacts, type Facts } from '@/lib/screen/facts';
import type { FactKey } from '@/lib/screen/types';
import type { JourneyContent } from '@/lib/tasks/types';
import { ui } from '@/lib/ui';
import { Row } from './ChoiceChips';
import { CheckResult, VerdictLine } from './CheckResult';
import { FactInputs, type FactChange } from './FactInputs';
import { Icon } from './Icon';
import { Saved } from './StationHead';
import { SITE_QUESTIONS } from './TaskCheck';

/** Everything the hard tests read; a humanoid's weather limit makes indoor and wet hard too. */
const CORE: readonly FactKey[] = ['object_mass_kg', 'variability', 'error_tolerance', 'safety_criticality', 'incumbent_automation', 'dust', 'environment', 'wet'];
const MORE: readonly FactKey[] = ['reach_height_m', 'data_sensitivity', 'runtime_continuous_min'];

type Draft = { title: string; family: FamilyId | ''; description: string; facts: Facts };

/**
 * Step 2 for a task the library does not have. Nothing is assumed: every
 * fact starts at "not sure" and the verdict waits for the hard tests. Once on
 * the shortlist the page edits the saved task (`?project=`).
 */
export function CustomCheck({ content, projectId }: { content: JourneyContent; projectId: string }) {
  const plan = usePlan();
  const router = useRouter();
  const id = useId();
  const [draft, setDraft] = useState<Draft>(() => ({ title: '', family: '', description: '', facts: emptyFacts() }));
  const found = plan.workspace?.projects.find((p) => p.id === projectId) ?? null;
  const saved = found?.task.kind === 'custom' ? found : null;
  const task: Draft = saved && saved.task.kind === 'custom' ? { title: saved.title, family: saved.task.family, description: saved.description, facts: { ...emptyFacts(), ...saved.task.facts } } : draft;
  const project: Project = saved ?? { ...newProject('preview', jobForFamily(task.family)), title: task.title, description: task.description, task: { kind: 'custom', family: task.family, facts: task.facts } };
  const result = screenForSite(project, content.machineClassFamilies);
  const machines = Object.fromEntries(content.machineClasses.map((m) => [m.id, m.title.en]));
  const full = !saved && (plan.workspace?.projects.length ?? 0) >= PROJECT_LIMIT;
  const answered = CORE.filter((k) => task.facts[k] !== null && task.facts[k] !== undefined).length;

  const edit = (patch: Partial<Draft>) => {
    if (saved) plan.updateProject(saved.id, (p) => p.task.kind !== 'custom' ? p : {
      ...p,
      title: patch.title ?? p.title,
      description: patch.description ?? p.description,
      task: { ...p.task, family: patch.family ?? p.task.family, facts: patch.facts ?? p.task.facts },
      gate: 'unknown', screenConfirmedAt: '',
    });
    else setDraft((current) => ({ ...current, ...patch }));
  };
  const setFact: FactChange = (key, value) => edit({ facts: { ...task.facts, [key]: value } });
  const add = () => {
    const next: Project = { ...newProject(crypto.randomUUID(), jobForFamily(task.family)), title: task.title.trim(), description: task.description.trim(), task: { kind: 'custom', family: task.family, facts: task.facts } };
    plan.addProject(next);
    router.replace('/use-cases/custom?project=' + next.id, { scroll: false });
  };
  const remove = () => {
    if (!saved) return;
    setDraft(task);
    plan.removeProject(saved.id);
    router.replace('/use-cases/custom', { scroll: false });
  };

  if (projectId && !plan.ready) return <p role="status" className="jp-muted">Opening your shortlist…</p>;
  return <>
    {projectId && !saved ? <p className="jp-notice">That task is no longer on your shortlist in this browser. Describe it again below.</p> : null}
    <section className="jp-card" aria-labelledby="custom-task">
      <div className="jp-card-head"><h2 id="custom-task">The task</h2><p>A name is enough to start. The description helps whoever you pass the shortlist to.</p></div>
      <div className="jp-rows is-first">
        <Row label="Task name" htmlFor={id + 'name'}><input id={id + 'name'} className={ui.input} maxLength={160} value={task.title} onChange={(event) => edit({ title: event.target.value })} placeholder="For example: carry fixings to the installers on each floor" /></Row>
        <Row label="Kind of work" htmlFor={id + 'family'}><select id={id + 'family'} className={ui.select + ' max-w-md'} value={task.family} onChange={(event) => edit({ family: event.target.value as FamilyId | '' })}><option value="">Not sure</option>{FAMILY_IDS.map((f) => <option key={f} value={f}>{content.families[f]?.en ?? f}</option>)}</select></Row>
        <Row label="What happens today?" hint="Who does it, how often, with what, and what goes wrong." htmlFor={id + 'today'}><textarea id={id + 'today'} className={ui.input + ' h-auto min-h-24 py-2'} rows={3} maxLength={4000} value={task.description} onChange={(event) => edit({ description: event.target.value })} /></Row>
      </div>
    </section>

    <section id="check" className="jp-card check-card" aria-labelledby="check-title" data-verdict={result.verdict}>
      <div className="jp-card-head"><h2 id="check-title">Does it hold on your site?</h2><p>Nothing is assumed for a task of your own. Answer what you know; a question left at “not sure” keeps its test open, and the verdict appears once the hard tests are answered.</p></div>
      <div className="check-questions">
        <h3 className="jp-h3">What the hard tests need <span className="jp-muted ml-2 font-normal">{answered} of {CORE.length} answered</span></h3>
        <FactInputs facts={task.facts} onChange={setFact} keys={CORE} labels={SITE_QUESTIONS} machineClasses={content.machineClasses} brief />
        <details className="jp-details"><summary>Three more conditions</summary><FactInputs facts={task.facts} onChange={setFact} keys={MORE} machineClasses={content.machineClasses} brief /></details>
      </div>
      <CheckResult result={result} where="on your site" machineLabel={(m) => machines[m] ?? m} solutionClasses={content.solutionClasses} />
      <div className="check-foot">
        <div className="flex flex-wrap items-center gap-6"><p className="check-echo"><span className="jp-muted">On your site</span><VerdictLine verdict={result.verdict} /></p>{saved ? <Saved /> : null}</div>
        <div className="jp-actions">
          {saved ? <>
            <span className="check-added" data-testid="task-added"><Icon name="pass" size={16} />In your shortlist</span>
            <button type="button" className={ui.btnGhost} onClick={remove}>Remove</button>
            <Link className={ui.btn} href="/plan">Go to my shortlist <Icon name="arrow" size={16} /></Link>
          </> : <>
            {!task.title.trim() ? <span className="jp-small">Name the task to add it.</span> : null}
            <button type="button" className={ui.btn} disabled={!plan.ready || full || !task.title.trim()} onClick={add}>{full ? `Shortlist is full (${PROJECT_LIMIT})` : 'Add to my shortlist'}</button>
          </>}
        </div>
      </div>
    </section>
  </>;
}
