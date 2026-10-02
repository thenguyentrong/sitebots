'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { INDUSTRY_IDS, INDUSTRIES, type IndustryId } from '@/lib/content/industries';
import type { ResearchedTask } from '@/lib/discovery/researched-tasks';
import type { Workflow } from '@/lib/solutions/workflows';
import { FAMILY_IDS, type FamilyId } from '@/lib/content/vocab';
import { jobForFamily } from '@/lib/plan/legacy';
import { newProject, type Project } from '@/lib/plan/model';
import { reviewForSite } from '@/lib/plan/screen';
import { PROJECT_LIMIT, usePlan } from '@/lib/plan/store';
import { emptyFacts, type Facts } from '@/lib/screen/facts';
import type { FactKey } from '@/lib/screen/types';
import type { JourneyContent } from '@/lib/tasks/types';
import { ui } from '@/lib/ui';
import { Row } from './ChoiceChips';
import { OpportunityResult, OpportunityStatus } from './OpportunityResult';
import { FactInputs, type FactChange } from './FactInputs';
import { Icon } from './Icon';
import { Saved } from './StationHead';
import { SITE_QUESTIONS } from './TaskCheck';

/** Shared task requirements; capability is assessed for each complete solution. */
const CORE: readonly FactKey[] = ['object_mass_kg', 'variability', 'error_tolerance', 'safety_criticality', 'incumbent_automation', 'dust', 'environment', 'wet', 'floor'];
const MORE: readonly FactKey[] = ['reach_height_m', 'data_sensitivity', 'runtime_continuous_min'];

type Draft = { title: string; family: FamilyId | ''; description: string; facts: Facts; industry?: IndustryId; workflowId?: string; opportunityId?: string };

/**
 * Step 2 for a task the library does not have. Nothing is assumed: every
 * fact starts at "not sure" and stays an open question until answered. Once on
 * the shortlist the page edits the saved task (`?project=`).
 */
export function CustomCheck({ content, projectId, workflow, initialIndustry, opportunity }: { content: JourneyContent; projectId: string; workflow?: Workflow; initialIndustry?: IndustryId; opportunity?: ResearchedTask }) {
  const plan = usePlan();
  const router = useRouter();
  const id = useId();
  const [draft, setDraft] = useState<Draft>(() => ({ title: opportunity?.title ?? workflow?.title ?? '', family: opportunity?.family ?? workflow?.family ?? '', description: opportunity?.summary ?? workflow?.summary ?? '', facts: emptyFacts(), industry: initialIndustry ?? (workflow?.industries.length === 1 ? workflow.industries[0] : undefined), workflowId: workflow?.id, opportunityId: opportunity?.id }));
  const found = plan.workspace?.projects.find((p) => p.id === projectId) ?? null;
  const saved = found?.task.kind === 'custom' ? found : null;
  const task: Draft = saved && saved.task.kind === 'custom' ? { title: saved.title, family: saved.task.family, description: saved.description, facts: { ...emptyFacts(), ...saved.task.facts }, industry: saved.task.industry, workflowId: saved.task.workflowId, opportunityId: saved.task.opportunityId } : draft;
  const project: Project = saved ?? { ...newProject('preview', jobForFamily(task.family)), title: task.title, description: task.description, task: { kind: 'custom', family: task.family, facts: task.facts, industry: task.industry, workflowId: task.workflowId, opportunityId: task.opportunityId } };
  const result = reviewForSite(project, content.machineClassFamilies);
  const full = !saved && (plan.workspace?.projects.length ?? 0) >= PROJECT_LIMIT;
  const answered = CORE.filter((k) => task.facts[k] !== null && task.facts[k] !== undefined).length;

  const edit = (patch: Partial<Draft>) => {
    if (saved) plan.updateProject(saved.id, (p) => p.task.kind !== 'custom' ? p : {
      ...p,
      title: patch.title ?? p.title,
      jobId: patch.family !== undefined && patch.family !== p.task.family ? jobForFamily(patch.family) : p.jobId,
      ideaId: patch.family !== undefined && patch.family !== p.task.family ? '' : p.ideaId,
      description: patch.description ?? p.description,
      task: { ...p.task, family: patch.family ?? p.task.family, facts: patch.facts ?? p.task.facts, industry: Object.hasOwn(patch, 'industry') ? patch.industry : p.task.industry, workflowId: patch.family !== undefined && patch.family !== p.task.family ? undefined : p.task.workflowId, opportunityId: (patch.family !== undefined && patch.family !== p.task.family) || (Object.hasOwn(patch, 'industry') && patch.industry !== p.task.industry) ? undefined : p.task.opportunityId },
      gate: 'unknown', screenConfirmedAt: '',
    });
    else setDraft((current) => ({ ...current, ...patch, workflowId: patch.family !== undefined && patch.family !== current.family ? undefined : current.workflowId, opportunityId: (patch.family !== undefined && patch.family !== current.family) || (Object.hasOwn(patch, 'industry') && patch.industry !== current.industry) ? undefined : current.opportunityId }));
  };
  const setFact: FactChange = (key, value) => edit({ facts: { ...task.facts, [key]: value } });
  const add = () => {
    const next: Project = { ...newProject(crypto.randomUUID(), jobForFamily(task.family)), title: task.title.trim(), description: task.description.trim(), objective: task.workflowId === workflow?.id ? workflow?.outcome ?? '' : '', solutionClasses: task.workflowId === workflow?.id ? workflow?.alternatives ?? [] : [], pilot: { scope: task.workflowId === workflow?.id ? workflow?.pilot ?? '' : '', success: '', stop: '', owner: '', date: '' }, task: { kind: 'custom', family: task.family, facts: task.facts, industry: task.industry, workflowId: task.workflowId, opportunityId: task.opportunityId } };
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
        <Row label="Industry" htmlFor={id + 'industry' }><select id={id + 'industry'} className={ui.select + ' max-w-md'} value={task.industry ?? ''} onChange={(event) => edit({ industry: event.target.value ? event.target.value as IndustryId : undefined })}><option value="">Not specified</option>{INDUSTRY_IDS.map((industry) => <option key={industry} value={industry}>{INDUSTRIES[industry].en}</option>)}</select></Row>
        <Row label="Kind of work" htmlFor={id + 'family'}><select id={id + 'family'} className={ui.select + ' max-w-md'} value={task.family} onChange={(event) => edit({ family: event.target.value as FamilyId | '' })}><option value="">Not sure</option>{FAMILY_IDS.map((f) => <option key={f} value={f}>{content.families[f]?.en ?? f}</option>)}</select></Row>
        <Row label="What happens today?" hint="Who does it, how often, with what, and what goes wrong." htmlFor={id + 'today'}><textarea id={id + 'today'} className={ui.input + ' h-auto min-h-24 py-2'} rows={3} maxLength={4000} value={task.description} onChange={(event) => edit({ description: event.target.value })} /></Row>
      </div>
    </section>

    <section id="check" className="jp-card check-card" aria-labelledby="check-title" data-status={result.status}>
      <div className="jp-card-head"><h2 id="check-title">Requirements on your site</h2><p>Answer what you know. Missing information stays visible while you compare possible approaches. Capturing requirements does not validate a robot.</p></div>
      <div className="check-questions">
        <h3 className="jp-h3">Task and site requirements <span className="jp-muted ml-2 font-normal">{answered} of {CORE.length} answered</span></h3>
        <FactInputs facts={task.facts} onChange={setFact} keys={CORE} labels={SITE_QUESTIONS} machineClasses={content.machineClasses} brief />
        <details className="jp-details"><summary>Three more conditions</summary><FactInputs facts={task.facts} onChange={setFact} keys={MORE} machineClasses={content.machineClasses} brief /></details>
      </div>
      <OpportunityResult result={result} solutionClasses={content.solutionClasses} />
      <div className="check-foot">
        <div className="flex flex-wrap items-center gap-6"><p className="check-echo"><span className="jp-muted">On your site</span><OpportunityStatus result={result} /></p>{saved ? <Saved /> : null}</div>
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
