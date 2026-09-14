'use client';

import type { Project } from '@/lib/plan/model';
import { nextAction } from '@/lib/plan/model';
import { ui } from '@/lib/ui';
import { Field, Notes } from './Fields';
import { PriorityMap } from './PlanCharts';

export function PriorityEditor({ project, projects, update, select }: { project: Project; projects: Project[]; update: (patch: Partial<Project>) => void; select: (id: string) => void }) {
  return <div className="space-y-6">
    <PriorityMap projects={projects} activeId={project.id} select={select} />
    <section className="card space-y-5 p-5 sm:p-6"><h2 className="text-xl font-semibold">Assess: {project.title}</h2>
      <div className="grid gap-5 md:grid-cols-2">{[
        { key: 'value' as const, label: 'Business value', hint: 'Value to this client: cost, capacity, quality, reduced exposure or strategic benefit.' },
        { key: 'readiness' as const, label: 'Deployment readiness', hint: 'Evidence for this task, complete configuration, integration, people and site preparation.' },
      ].map((field) => <Field key={field.key} label={field.label} hint={field.hint}><select className={ui.select} value={project[field.key]} onChange={(event) => update({ [field.key]: event.target.value })}><option value="">Not assessed</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></Field>)}</div>
      <Notes label="Why this position?" value={project.rationale} onChange={(rationale) => update({ rationale })} placeholder="Define the thresholds for this client, evidence used and assumptions still open." />
      <p className="text-sm text-muted">{nextAction(project)}</p>
      <p className="text-xs text-muted">A custom project-priority assessment. These axes are not market growth and market share, and the map is not an official BCG or McKinsey rating.</p>
    </section>
  </div>;
}
