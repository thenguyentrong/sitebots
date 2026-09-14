'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { jobById, settingLabel } from '@/lib/plan/jobs';
import { costResult, newProject, type PlanOption, type Project } from '@/lib/plan/model';
import { usePlan } from '@/lib/plan/store';
import { ui } from '@/lib/ui';
import { JobEditor } from './JobEditor';
import { JobLibrary } from './JobLibrary';
import { SolutionPicker } from './SolutionPicker';
import { CostEditor } from './CostEditor';
import { PilotBrief } from './PilotBrief';
import { PriorityEditor } from './PriorityEditor';
import { Field } from './Fields';
import { PlanIcon } from './PlanIcon';
import { PriorityMap } from './PlanCharts';

type Step = 'job' | 'solutions' | 'costs' | 'brief' | 'priorities';
const STEPS = [
  { id: 'job', label: 'Your job', hint: 'Define the work', title: 'Describe the job.' },
  { id: 'solutions', label: 'Solutions', hint: 'Build your shortlist', title: 'Find a good fit.' },
  { id: 'costs', label: 'Costs', hint: 'Make the business case', title: 'Do the numbers work?' },
  { id: 'brief', label: 'Pilot brief', hint: 'Decide what to test', title: 'Make the next move.' },
] as const;
export function PlanWorkspace({ mode, surface = 'planner', initialStep = 1 }: { mode?: string; surface?: 'planner' | 'finder'; initialStep?: number }) {
  const finder = surface === 'finder';
  const plan = usePlan();
  const router = useRouter();
  const [step, setStep] = useState<Step>(STEPS[initialStep - 1]?.id ?? 'job');
  const [exploring, setExploring] = useState(mode === 'explore');
  const [setting, setSetting] = useState<Project['setting']>('');
  const initialized = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!plan.ready || initialized.current) return;
    initialized.current = true;
    if (!plan.project && mode === 'assess') plan.addProject(newProject(crypto.randomUUID()));
  }, [plan.ready, plan.project, plan.addProject, mode]);
  useEffect(() => {
    if (!finder) return;
    setStep(STEPS[initialStep - 1]?.id ?? 'job');
    setExploring(mode === 'explore');
  }, [finder, initialStep, mode]);
  if (!plan.ready && !finder) return <p role="status" className="py-20 text-sm text-muted">Opening your assessment…</p>;
  const { project, workspace } = plan;
  function start(jobId = 'custom') {
    plan.addProject(newProject(crypto.randomUUID(), jobId, setting));
    setExploring(false); setStep('job');
    router.replace(finder ? '/?step=1#matcher' : '/plan', { scroll: false });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function go(next: Step) {
    setStep(next);
    if (finder) router.push('/?step=' + (STEPS.findIndex((item) => item.id === next) + 1) + '#matcher', { scroll: false });
    contentRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function explore() {
    setExploring(true);
    if (finder) router.push('/#matcher', { scroll: false });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function resume() {
    setExploring(false);
    router.replace(finder ? '/?step=' + (STEPS.findIndex((item) => item.id === step) + 1) + '#matcher' : '/plan', { scroll: false });
  }
  function update(patch: Partial<Project>) {
    if (!project) return;
    plan.updateProject(project.id, (current) => ({
      ...current, ...patch,
      ...(patch.needs || patch.setting !== undefined || patch.jobId || patch.description !== undefined || (patch.selectedOptionId && patch.selectedOptionId !== current.selectedOptionId) ? { gate: 'unknown' as const } : {}),
    }));
  }
  function updateOption(id: string, patch: Partial<PlanOption>) {
    if (!project) return;
    plan.updateProject(project.id, (current) => ({ ...current, options: current.options.map((option) => option.id === id ? { ...option, ...patch } : option) }));
  }
  if (!project || exploring) return <>
    {plan.persistenceError ? <p role="status" className="py-4 text-sm text-muted">Browser storage is unavailable. These changes are not saved.</p> : null}
    <JobLibrary surface={surface} ready={plan.ready} setting={setting} setSetting={setSetting} start={start} full={(workspace?.projects.length ?? 0) >= 12} resume={project ? { title: project.title, action: resume } : undefined} />
  </>;
  const robotIds = project.options.flatMap((option) => option.robotId ? [option.robotId] : []);
  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const priced = project.options.filter((option) => costResult(option.costs).kind === 'ready').length;
  return <div id={finder ? 'matcher' : undefined} className="plan-workspace">
    <aside className="plan-sidebar plan-screen">
      <button className="plan-back" onClick={explore}>← Explore jobs</button>
      <div className="plan-project-select"><Field label="Current opportunity"><select className={ui.select} value={project.id} onChange={(event) => { plan.selectProject(event.target.value); }}>
        {workspace?.projects.map((item) => <option key={item.id} value={item.id}>{item.title || 'Untitled opportunity'}</option>)}
      </select></Field><button className="plan-new" disabled={(workspace?.projects.length ?? 0) >= 12} onClick={explore}>+ New opportunity</button></div>
      <nav className="plan-steps" aria-label={finder ? 'Find a robot steps' : 'Assessment steps'}>{STEPS.map((item, index) => <button key={item.id} aria-label={(index + 1) + '. ' + item.label} aria-current={step === item.id ? 'step' : undefined} onClick={() => go(item.id)}>
        <span className="plan-step-number">{'0' + (index + 1)}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span><span className="plan-step-arrow" aria-hidden="true">→</span>
      </button>)}</nav>
      {!finder && (workspace?.projects.length ?? 0) > 1 ? <button className={'plan-priorities-link' + (step === 'priorities' ? ' is-active' : '')} aria-current={step === 'priorities' ? 'page' : undefined} onClick={() => go('priorities')}><span aria-hidden="true">▦</span> Project priorities</button> : null}
      <div className="plan-sidebar-summary"><PlanIcon name={project.jobId} size={26} /><h2>{jobById(project.jobId).family}</h2><p>{settingLabel(project.setting)}</p><dl><div><dt>Shortlisted</dt><dd>{project.options.length} solutions</dd></div><div><dt>Costed</dt><dd>{priced} of {project.options.length}</dd></div></dl><span>No purchase decision is made here.</span></div>
    </aside>
    <div className="plan-main" ref={contentRef}>
      <header className="plan-work-header plan-screen"><div><p className="plan-kicker">{step === 'priorities' ? 'Across your opportunities' : (finder ? 'Find a robot / Step 0' : 'Automation planner / Step 0') + (stepIndex + 1)}</p><h1>{step === 'priorities' ? 'See the bigger picture.' : STEPS[stepIndex].title}</h1></div><p className="plan-saved" role="status"><span className={plan.persistenceError ? 'is-error' : ''} />{plan.persistenceError ? 'Not saved — browser storage unavailable' : 'Saved in this browser'}</p></header>
      {step === 'job' ? <JobEditor key={project.id} project={project} update={update} next={() => go('solutions')} /> : null}
      {step === 'solutions' ? <SolutionPicker key={project.id} project={project} update={update} next={() => go('costs')} /> : null}
      {step === 'costs' ? <CostEditor project={project} updateOption={updateOption} select={(id) => update({ selectedOptionId: id })} next={() => go('brief')} back={() => go('solutions')} /> : null}
      {step === 'brief' ? <>
        <PilotBrief project={project} update={update} />
        {finder && workspace ? <div className="plan-screen mt-8"><PriorityMap projects={workspace.projects} activeId={project.id} select={plan.selectProject} title="Your 3×3 decision overview" /></div> : null}
      </> : null}
      {step === 'priorities' && workspace ? <PriorityEditor project={project} projects={workspace.projects} update={update} select={plan.selectProject} /> : null}
      {robotIds.length && step !== 'brief' ? <div className="plan-screen mt-6 flex justify-end"><Link className="plan-text-link text-sm" href={'/compare?ids=' + robotIds.join(',')}>Open robot comparison →</Link></div> : null}
    </div>
  </div>;
}