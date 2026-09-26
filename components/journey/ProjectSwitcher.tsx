'use client';

import Link from 'next/link';
import { useId } from 'react';
import { usePlan } from '@/lib/plan/store';
import { ui } from '@/lib/ui';

/** Which task the Decide pages work on; they operate on one task at a time. */
export function ProjectSwitcher() {
  const plan = usePlan();
  const id = useId();
  const projects = plan.workspace?.projects ?? [];
  const project = plan.project;
  if (!plan.ready) return <p role="status" className="jp-muted">Opening your plan…</p>;
  if (!projects.length) return <section className="jp-card"><div className="jp-card-head"><h2>No task on your shortlist yet</h2><p>Check a task from the library or one of your own, then add it.</p></div><div className="jp-actions"><Link className={ui.btn} href="/use-cases">Find your work</Link><Link className={ui.btnSecondary} href="/use-cases/custom">Check a task of your own</Link></div></section>;
  return <div className="plan-screen flex flex-wrap items-end justify-between gap-4">
    <div className="w-full max-w-md"><label htmlFor={id} className="jp-label">Task</label><select id={id} className={ui.select + ' mt-2'} value={project?.id ?? ''} onChange={(event) => plan.selectProject(event.target.value)}>{projects.map((item) => <option key={item.id} value={item.id}>{item.title || 'Untitled task'}</option>)}</select></div>
    <div className="jp-actions">
      <Link className={ui.btnSecondary} href="/use-cases">Add another task</Link>
      {project ? <button type="button" className={ui.btnGhost} onClick={() => { if (window.confirm('Remove “' + (project.title || 'Untitled task') + '” from this browser?')) plan.removeProject(project.id); }}>Remove task</button> : null}
    </div>
  </div>;
}
