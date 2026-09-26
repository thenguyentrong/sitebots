'use client';

import Link from 'next/link';
import { useState } from 'react';
import { emptyCosts, optionForRobot, type PlanOption, type Project } from '@/lib/plan/model';
import { jobById } from '@/lib/plan/jobs';
import { ui } from '@/lib/ui';
import { EvidenceDetails } from './EvidenceDetails';
import { Field, Notes } from './Fields';
import { PlanComparison } from './PlanComparison';
import { PriceReference } from './PriceReference';
import { alternativesFor } from '@/lib/plan/intake';
import { useAssessment } from './useAssessment';

export function SolutionPicker({ project, update, next }: { project: Project; update: (patch: Partial<Project>) => void; next: () => void }) {
  const suggestions = useAssessment(project);
  const selectedIds = project.options.flatMap((option) => option.robotId ? [option.robotId] : []);
  const selected = useAssessment(project, selectedIds, selectedIds.length > 0);
  const [custom, setCustom] = useState('');
  const [expanded, setExpanded] = useState(false);
  const full = project.options.length >= 4;
  function add(option: PlanOption) {
    if (full || project.options.some((item) => item.id === option.id)) return;
    update({ options: [...project.options, option], selectedOptionId: option.id, gate: 'unknown' });
  }
  const current = project.options.find((option) => option.id === project.selectedOptionId) ?? project.options[0];
  const edit = (patch: Partial<PlanOption>) => { if (current) update({ options: project.options.map((option) => option.id === current.id ? { ...option, ...patch } : option), gate: 'unknown' }); };
  return <div className="space-y-6">
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">{project.focus === 'humanoid' ? 'Humanoids to investigate' : 'Robots to investigate'}</h2><p className="mt-2 text-sm text-muted">Start with a few candidates. Check why each appears, what is unconfirmed and its price evidence.</p></div><Link className={ui.btnSecondary} href="/robots">Browse all robots</Link></div>
      {!suggestions.valid ? <p className="card p-5 text-sm text-muted">This job has no mapped catalogue capability yet. Add known load, reach or operating requirements to screen robot specifications, or use a custom solution to plan the research.</p> : suggestions.loading ? <p role="status" className="card p-5 text-sm text-muted">Checking the catalogue against your requirements…</p> : suggestions.error ? <p role="alert" className="card p-5 text-sm">{suggestions.error} <button className="underline" onClick={suggestions.retry}>Try again</button></p> : suggestions.data ? <>
        <p className="mb-4 text-xs text-muted">{suggestions.data.considered} configurations checked · {suggestions.data.blocked} excluded by the filters · ranked by recorded matches, with unknowns kept visible</p>
        {!suggestions.data.results.length ? <p className="card p-5 text-sm">No catalogue candidates remain under these requirements. Compare another approach or record the research gap in your pilot brief.</p> : <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">{suggestions.data.results.slice(0, expanded ? 12 : 3).map((robot) => {
          const added = project.options.some((option) => option.id === robot.id);
          return <article className="card p-5" key={robot.id}>
            <p className="text-xs text-muted">{robot.manufacturer} · {robot.variant}</p><h3 className="mt-2 text-lg font-semibold"><Link className="hover:underline" href={robot.href}>{robot.name}</Link></h3>
            <p className="finder-candidate-reason">{robot.criteria.find((item) => item.id === 'tasks')?.status === 'pass' ? 'The selected task is listed in the catalogue evidence.' : robot.criteria.find((item) => item.id === 'tasks')?.status === 'partial' ? 'The task is reported; confirm it with the manufacturer.' : 'Platform to research. Performance for this task is unconfirmed.'}</p>
            <PriceReference result={robot} />
            <p className="mt-3 text-sm">{robot.open ? robot.open + ' requirements need confirmation' : 'Published requirements match; complete setup needs review'}</p>
            <EvidenceDetails result={robot} />
            <div className="mt-5 flex flex-wrap gap-2"><button className={ui.btnSecondary + ' px-3'} disabled={added || full} onClick={() => add(optionForRobot(robot))}>{added ? 'Added to assessment' : 'Add to assessment'}</button><Link className={ui.btnGhost + ' px-2'} href={robot.href}>Profile ↗</Link></div>
          </article>;
        })}</div>}
        {!expanded && suggestions.data.results.length > 3 ? <button className={ui.btnSecondary + ' mt-5'} onClick={() => setExpanded(true)}>Show more candidates</button> : null}
      </> : null}
    </section>
    <section className="card p-5 sm:p-6">
      <h2 className="text-xl font-semibold">Solutions to compare</h2>
      <p className="mt-3 max-w-3xl text-sm text-muted">Keep up to four setups to compare. Select a robot above, or add another approach below.</p>
      <div className="finder-alternative"><div><p className="plan-kicker">Also worth comparing</p><p>{alternativesFor(project)}</p></div><button className="plan-secondary" disabled={full || project.options.some((option) => option.id === 'alternative-' + project.jobId)} onClick={() => add({ id: 'alternative-' + project.jobId, kind: 'custom', name: alternativesFor(project), package: '', operator: '', evidence: '', costs: emptyCosts() })}>Add this alternative</button></div>
      <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); if (custom.trim()) { add({ id: crypto.randomUUID(), kind: 'custom', name: custom.trim(), package: '', operator: '', evidence: '', costs: emptyCosts() }); setCustom(''); } }}>
        <div className="min-w-0 flex-[1_1_20rem]"><Field label="Add another solution"><input className={ui.input} maxLength={160} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="For example: AMR with carts, a fixed cell, process changes" /></Field></div>
        <button type="submit" className={ui.btnSecondary} disabled={full || !custom.trim()}>Add custom solution</button>
      </form>
      {full ? <p role="status" className="mt-3 text-sm text-muted">Four solutions selected. Remove one to add another.</p> : null}
      {project.options.length ? <div className="mt-5 flex flex-wrap gap-2">{project.options.map((option) => <div key={option.id} className="flex max-w-full items-center gap-1 rounded-full border border-edge p-1"><button type="button" className={current?.id === option.id ? ui.btn + ' h-8 px-3 text-xs' : ui.btnGhost + ' h-8 px-3 text-xs'} style={{ whiteSpace: 'normal', height: 'auto', minHeight: 32, textAlign: 'left', overflowWrap: 'anywhere' }} onClick={() => update({ selectedOptionId: option.id })}>Edit {option.name}</button><button type="button" aria-label={'Remove ' + option.name} className={ui.btnGhost + ' h-8 px-3'} onClick={() => update({ options: project.options.filter((item) => item.id !== option.id), selectedOptionId: project.options.find((item) => item.id !== option.id)?.id ?? '', gate: 'unknown' })}>×</button></div>)}</div> : null}
      {current ? <details className="mt-5"><summary className="cursor-pointer text-sm font-medium">Define the full setup and human responsibilities</summary><div className="mt-5 grid gap-5 md:grid-cols-2">
        <Notes label={'Complete setup for ' + current.name} value={current.package} onChange={(value) => edit({ package: value })} placeholder={jobById(project.jobId).setup.join('; ')} />
        <Notes label="What does a person still do?" value={current.operator} onChange={(value) => edit({ operator: value })} placeholder="Loading, setup, supervision, exceptions, charging and maintenance." />
      </div></details> : null}
    </section>
    {project.options.length ? <><details className="card p-5"><summary className="cursor-pointer font-medium">Compare selected setups ({project.options.length})</summary><div className="mt-5"><PlanComparison project={project} results={selected.data?.results} /></div></details>{selected.loading ? <p role="status" className="text-sm text-muted">Checking selected robots against your job…</p> : selected.error ? <p role="alert" className="text-sm text-destructive">{selected.error} <button className="underline" onClick={selected.retry}>Retry</button></p> : null}{selected.data?.missing.length ? <p className="text-sm text-muted">A saved robot is no longer available in the public catalogue. Its suitability needs a fresh review.</p> : null}<div className="flex justify-end"><button className={ui.btn} onClick={next}>Estimate costs →</button></div></> : null}

  </div>;
}
