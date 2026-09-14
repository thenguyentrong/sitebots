'use client';

import Link from 'next/link';
import { jobById, settingLabel } from '@/lib/plan/jobs';
import { costResult, euro, nextAction, type Project } from '@/lib/plan/model';
import { ui } from '@/lib/ui';
import { Field, Notes } from './Fields';
import { EvidenceDetails } from './EvidenceDetails';
import { PlanComparison } from './PlanComparison';
import { useAssessment } from './useAssessment';

export function PilotBrief({ project, update }: { project: Project; update: (patch: Partial<Project>) => void }) {
  const job = jobById(project.jobId);
  const ids = project.options.flatMap((option) => option.robotId ? [option.robotId] : []);
  const assessment = useAssessment(project, ids, ids.length > 0);
  const chosen = project.options.find((option) => option.id === project.selectedOptionId) ?? project.options[0];
  const checked = assessment.data?.results.find((result) => result.id === chosen?.robotId);
  const open = !project.gateNote.trim() || !chosen || !chosen.package || !chosen.operator || (chosen.kind === 'robot' ? !checked || checked.open > 0 : !chosen.evidence);
  const action = nextAction(project, checked?.blocked, open);
  const pilot = (key: keyof Project['pilot'], value: string) => update({ pilot: { ...project.pilot, [key]: value } });
  return <div className="space-y-6">
    <section className="plan-screen card space-y-5 p-5 sm:p-6">
      <p className="eyebrow">04 / Pilot and decision</p><h2 className="text-xl font-semibold">What must we learn before investing?</h2>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Solution to investigate"><select className={ui.select} value={chosen?.id ?? ''} onChange={(event) => update({ selectedOptionId: event.target.value, gate: 'unknown' })}><option value="">Select a solution</option>{project.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></Field>
        <Field label="Critical requirements review"><select className={ui.select} value={project.gate} onChange={(event) => update({ gate: event.target.value as Project['gate'] })}><option value="unknown">Evidence still missing</option><option value="confirmed">Confirmed for this configuration</option><option value="blocked">Known blocker</option></select></Field>
        <Field label="Business value"><select className={ui.select} value={project.value} onChange={(event) => update({ value: event.target.value as Project['value'] })}><option value="">Not assessed</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
        <Field label="Deployment readiness"><select className={ui.select} value={project.readiness} onChange={(event) => update({ readiness: event.target.value as Project['readiness'] })}><option value="">Not assessed</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>
        <div className="md:col-span-2"><Notes label="Why this position?" value={project.rationale} onChange={(rationale) => update({ rationale })} placeholder="What supports the business value and readiness ratings? Record the evidence and open assumptions." /></div>
        <Notes label="Evidence, dependencies or blocker" value={project.gateNote} onChange={(gateNote) => update({ gateNote })} placeholder="Who confirmed what, for which configuration and conditions? Include source references." />
        <Notes label="Pilot scope" value={project.pilot.scope} onChange={(value) => pilot('scope', value)} placeholder="A representative route, area or production step; duration, operating conditions and fallback." />
        <Notes label="Success criteria" value={project.pilot.success} onChange={(value) => pilot('success', value)} placeholder={job.measures.join('; ') + '. Agree measurable thresholds.'} />
        <Notes label="Stop or reconsider if" value={project.pilot.stop} onChange={(value) => pilot('stop', value)} placeholder="Which failures, interventions, quality issues or costs would change the decision?" />
        <Field label="Decision owner"><input className={ui.input} maxLength={160} value={project.pilot.owner} onChange={(event) => pilot('owner', event.target.value)} /></Field>
        <Field label="Next review date"><input type="date" className={ui.input} value={project.pilot.date} onChange={(event) => pilot('date', event.target.value)} /></Field>
      </div>
    </section>
    <div className="plan-screen flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">Review the brief below, then print or save it as a PDF.</p><button type="button" className={ui.btn} onClick={() => window.print()}>Print decision brief</button></div>
    <article data-plan-brief className="card space-y-7 p-5 sm:p-8">
      <header className="border-b border-edge pb-5"><p className="eyebrow">Sitebots / Decision brief</p><h2 className="mt-2 text-2xl font-semibold">{project.title || 'Untitled opportunity'}</h2><p className="mt-2 text-sm text-muted">{settingLabel(project.setting)} · {job.title}</p></header>
      <section><h3 className="text-lg font-semibold">Recommended next step</h3><p className="mt-2" data-testid="plan-next-action">{action}</p><p className="mt-2 text-sm text-muted">For {chosen?.name ?? 'a solution still to be selected'}. This is an assessment based on the information below.</p></section>
      <div className="grid gap-6 sm:grid-cols-2">
        <section><h3 className="font-semibold">Desired outcome</h3><p className="mt-2 whitespace-pre-wrap text-sm">{project.objective || 'Client objective not recorded.'}</p></section>
        <section><h3 className="font-semibold">Current process</h3><p className="mt-2 whitespace-pre-wrap text-sm">{project.baseline || 'Baseline not recorded.'}</p></section>
      </div>
      {project.description ? <section><h3 className="font-semibold">Job description</h3><p className="mt-2 whitespace-pre-wrap text-sm">{project.description}</p></section> : null}
      <section><h3 className="font-semibold">Requirements supplied</h3><ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
        {Object.entries(project.needs).map(([key, value]) => <li key={key}><span className="font-medium">{{ payload: 'Carried load (kg)', reach: 'Working reach (m)', runtime: 'Continuous work (hours)', terrain: 'Ground', stairs: 'Stairs', environment: 'Exposure', autonomy: 'Operation' }[key]}: </span>{value || 'Not specified'}</li>)}
      </ul></section>
      <section><h3 className="font-semibold">Business priority</h3><p className="mt-2 text-sm">Value: {project.value || 'not assessed'} · Readiness: {project.readiness || 'not assessed'}</p><p className="mt-2 whitespace-pre-wrap text-sm">{project.rationale || 'Assessment rationale not recorded.'}</p></section><section><h3 className="font-semibold">Critical evidence and dependencies</h3><p className="mt-2 whitespace-pre-wrap text-sm">{project.gateNote || 'Confirmation evidence has not been recorded.'}</p><p className="mt-2 text-sm text-muted">Client review: {project.gate}. {open ? 'Configuration, task evidence or human responsibilities remain open.' : 'Review the cited configuration and evidence.'}</p></section>
      {project.options.length ? <PlanComparison project={project} results={assessment.data?.results} /> : <p className="text-sm text-muted">No alternative solutions recorded yet.</p>}
      <section><h3 className="font-semibold">Cost assumptions by solution</h3><div className="mt-3 space-y-4">{project.options.map((option) => {
        const cost = costResult(option.costs);
        return <div key={option.id} className="border-l-2 border-edge pl-4"><h4 className="font-medium">{option.name}</h4><p className="mt-1 text-sm">Initial spend: {option.costs.initial || 'unknown'} € · Released hours/year: {option.costs.hours || 'unknown'} · Labor cost/hour: {option.costs.rate || 'unknown'} € · Cash conversion: {option.costs.cashShare || 'unknown'}% · Additional annual cost: {option.costs.annual || 'unknown'} €</p><p className="mt-1 text-sm">{cost.kind === 'ready' ? 'Net annual cash benefit: ' + euro(cost.net) + '; simple payback: ' + (cost.payback !== null ? cost.payback.toFixed(1) + ' years.' : 'none under these assumptions.') : 'Business case incomplete.'}</p><p className="mt-2 whitespace-pre-wrap text-xs text-muted">{option.evidence || 'Basis for estimates not recorded.'}</p></div>;
      })}</div><p className="mt-3 text-xs text-muted">Client estimates, constant annual cash flow and no discounting, ramp-up, tax, financing or residual value. Released time is separate from realized cash savings.</p></section>
      <section><h3 className="font-semibold">Pilot plan</h3><dl className="mt-3 space-y-3 text-sm">{[
        ['Scope', project.pilot.scope], ['Acceptance criteria', project.pilot.success], ['Stop / reconsider criteria', project.pilot.stop], ['Owner', project.pilot.owner], ['Next review', project.pilot.date],
      ].map(([label, value]) => <div key={label}><dt className="font-medium">{label}</dt><dd className="mt-1 whitespace-pre-wrap">{value || 'To agree'}</dd></div>)}</dl>
      {!project.pilot.success ? <p className="mt-3 text-sm text-muted">Suggested measures to discuss: {job.measures.join('; ')}.</p> : null}</section>
      {assessment.loading ? <p role="status" className="text-sm">Refreshing catalogue evidence…</p> : assessment.error ? <p role="alert" className="text-sm">{assessment.error} <button className="plan-screen underline" onClick={assessment.retry}>Retry</button></p> : null}
      {assessment.data?.missing.length ? <p className="text-sm">A saved robot is no longer available in the public catalogue. Recheck it before making a decision.</p> : null}
      {assessment.data?.results.map((result) => <section key={result.id} className="plan-evidence"><h3 className="font-semibold"><Link href={result.href} className={ui.link}>{result.name}</Link> · catalogue evidence</h3><EvidenceDetails result={result} /></section>)}
    </article>
  </div>;
}
