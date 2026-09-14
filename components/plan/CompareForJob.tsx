'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { optionForRobot } from '@/lib/plan/model';
import { usePlan } from '@/lib/plan/store';
import { ui } from '@/lib/ui';
import type { RobotChoice } from './RobotPlanFit';
import { PlanComparison } from './PlanComparison';
import { useAssessment } from './useAssessment';

export function CompareForJob({ robots }: { robots: RobotChoice[] }) {
  const plan = usePlan();
  const options = robots.length ? robots.map((robot) => plan.project?.options.find((option) => option.robotId === robot.id) ?? optionForRobot(robot)) : plan.project?.options ?? [];
  const ids = options.flatMap((option) => option.robotId ? [option.robotId] : []);
  const assessment = useAssessment(plan.project, ids, ids.length > 0);
  if (!plan.project) return <section className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-semibold">Compare for a real job</h2><p className="mt-1 text-sm text-muted">Define the work to compare task fit, setup costs and human responsibilities.</p></div><Link href="/plan?mode=assess" className={ui.btnSecondary}>Assess my job</Link></section>;
  const project = plan.project;
  const additions = options.filter((option) => !project.options.some((existing) => existing.id === option.id));
  const fits = project.options.length + additions.length <= 4;
  return <div className="mb-8 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">Using your saved assessment: <span className="font-medium text-foreground">{project.title}</span></p><div className="flex flex-wrap gap-2">{additions.length ? <button className={ui.btnSecondary} disabled={!fits} onClick={() => plan.updateProject(project.id, (current) => ({ ...current, options: [...current.options, ...additions], selectedOptionId: additions[0].id, gate: 'unknown' }))}>{fits ? 'Add these to my assessment' : 'Assessment has four solutions'}</button> : null}<Link className={ui.btn} href="/plan">Open assessment</Link></div></div>
    <PlanComparison project={{ ...project, options }} results={assessment.data?.results} />
    {assessment.loading ? <p role="status" className="text-sm text-muted">Checking the current job requirements…</p> : null}
    {assessment.error ? <p role="alert" className="text-sm">{assessment.error} <button className="underline" onClick={assessment.retry}>Retry</button></p> : null}
    {assessment.data?.missing.length ? <p className="text-sm text-muted">A selected configuration is not currently available for catalogue screening.</p> : null}
  </div>;
}
export function TechnicalComparison({ children }: { children: ReactNode }) {
  const { project } = usePlan();
  return <details open={!project} className="mt-6"><summary className="mb-5 cursor-pointer text-lg font-semibold">All published specifications</summary>{children}</details>;
}
