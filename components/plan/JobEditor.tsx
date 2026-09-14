'use client';

import { JOBS, SETTINGS, jobById } from '@/lib/plan/jobs';
import { requirementsFor, type Project } from '@/lib/plan/model';
import { ui } from '@/lib/ui';
import { Field, Notes } from './Fields';
import { TaskMap } from './PlanCharts';
import { PlanIcon } from './PlanIcon';

export function JobEditor({ project, update, next }: { project: Project; update: (patch: Partial<Project>) => void; next: () => void }) {
  const job = jobById(project.jobId);
  const parsed = requirementsFor(project);
  const known = Object.values(project.needs).filter(Boolean).length;
  const need = (key: keyof Project['needs'], value: string) => update({ needs: { ...project.needs, [key]: value } });
  return <div className="plan-job-editor">
    <div className="plan-job-layout">
      <section className="plan-panel plan-job-form">
        <div className="plan-panel-heading"><h2>What would you like to automate?</h2><p>A rough description is enough to get started.</p></div>
        <Field label="Opportunity name"><input className={ui.input} maxLength={160} value={project.title} onChange={(event) => update({ title: event.target.value })} placeholder="Give this job a short name" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Work setting"><select className={ui.select} value={project.setting} onChange={(event) => update({ setting: event.target.value as Project['setting'] })}><option value="">Not sure yet</option>{SETTINGS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
          <Field label="Job to explore"><select className={ui.select} value={project.jobId} onChange={(event) => update({ jobId: event.target.value, gate: 'unknown' })}>{JOBS.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
        </div>
        <Notes label="Describe the work" value={project.description} onChange={(description) => update({ description })} placeholder="For example: move loaded totes from storage to two assembly stations, about 30 times each shift." hint="The shortlist uses your selected job and requirements. This description is saved in your brief." />
        <details className="plan-inline-details">
          <summary><span>Add goals and current process<small>Optional · helps compare the options</small></span><span className="plan-disclosure" aria-hidden="true">+</span></summary>
          <div className="space-y-5 pt-5"><Notes label="What should improve?" value={project.objective} onChange={(objective) => update({ objective })} placeholder="Less carrying, more consistent output, shorter queues…" /><Notes label="How is it done today?" value={project.baseline} onChange={(baseline) => update({ baseline })} placeholder="People, equipment, frequency, time and current problems." /></div>
        </details>
      </section>
      <aside className="plan-task-guide">
        <span className="plan-guide-icon"><PlanIcon name={job.id} size={30} /></span><p className="plan-kicker">A useful starting point</p><h2>{job.family}</h2><p className="plan-guide-outcome">{job.outcome}</p>
        <h3>Think about</h3><ol>{job.questions.map((question, index) => <li key={question}><span>{'0' + (index + 1)}</span>{question}</li>)}</ol>
        <details><summary>What the full solution includes <span aria-hidden="true">+</span></summary><ul>{job.setup.map((item) => <li key={item}>{item}</li>)}</ul></details>
      </aside>
    </div>
    <details className="plan-panel plan-requirements" open={!parsed.success ? true : undefined}>
      <summary><span className="plan-requirements-icon"><PlanIcon name="layout" /></span><span><strong>Add working requirements</strong><small>{known ? known + ' conditions recorded · edit or add more' : 'Load, ground, reach and operating conditions'}</small></span><span className="plan-optional">Optional</span><span className="plan-disclosure" aria-hidden="true">+</span></summary>
      <div className="plan-requirements-body"><p className="mb-5 text-sm text-muted">Fill in what you know. Leave the rest open for supplier confirmation.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Carried load (kg)" hint="Include container and mount; lifting is assessed separately."><input type="number" min="0.1" max="2000" step="any" className={ui.input} value={project.needs.payload} onChange={(event) => need('payload', event.target.value)} placeholder="Not sure" /></Field>
            <Field label="Working reach (m)"><input type="number" min="0.1" max="10" step="any" className={ui.input} value={project.needs.reach} onChange={(event) => need('reach', event.target.value)} placeholder="Not sure" /></Field>
            <Field label="Ground"><select className={ui.select} value={project.needs.terrain} onChange={(event) => need('terrain', event.target.value)}><option value="">Not sure yet</option><option value="paved">Paved / slab</option><option value="gravel">Gravel</option><option value="rubble">Rubble</option><option value="mud">Mud</option></select></Field>
            <Field label="Stairs"><select className={ui.select} value={project.needs.stairs} onChange={(event) => need('stairs', event.target.value)}><option value="">Not sure yet</option><option value="none">Not needed</option><option value="required">Must climb stairs</option></select></Field>
            <Field label="Exposure"><select className={ui.select} value={project.needs.environment} onChange={(event) => need('environment', event.target.value)}><option value="">Not sure yet</option><option value="indoor">Indoor</option><option value="outdoor">Outdoor</option><option value="both">Both</option></select></Field>
            <Field label="Operation"><select className={ui.select} value={project.needs.autonomy} onChange={(event) => need('autonomy', event.target.value)}><option value="">Not sure yet</option><option value="teleop_ok">Teleoperation acceptable</option><option value="supervised">Supervised autonomy</option><option value="autonomous">Fully autonomous</option></select></Field>
            <Field label="Continuous work (hours)" hint="Battery changes are not assumed."><input type="number" min="0.1" max="24" step="any" className={ui.input} value={project.needs.runtime} onChange={(event) => need('runtime', event.target.value)} placeholder="Not sure" /></Field>
            <Field label="How much does the task vary?"><select className={ui.select} value={project.variability} onChange={(event) => update({ variability: event.target.value as Project['variability'] })}><option value="">Not assessed</option><option value="low">Low — repeated, stable task</option><option value="medium">Medium — some variation</option><option value="high">High — changes frequently</option></select></Field>
          </div>

        {!parsed.success ? <p role="alert" className="mt-4 text-sm text-destructive">Check the numbers: load 0–2,000 kg, reach 0–10 m and continuous work 0–24 hours, all greater than zero.</p> : null}
      </div>
    </details>
    {project.needs.payload && project.variability && parsed.success ? <TaskMap project={project} /> : null}
    <div className="plan-next"><p>You can come back and refine this.<br /><span>Next: compare robots and other approaches.</span></p><button className="plan-primary" disabled={!parsed.success} onClick={next}>Explore solutions <span aria-hidden="true">→</span></button></div>
  </div>;
}