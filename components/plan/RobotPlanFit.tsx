'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { newProject, optionForRobot } from '@/lib/plan/model';
import { usePlan } from '@/lib/plan/store';
import { ui } from '@/lib/ui';
import { useAssessment } from './useAssessment';
import { EvidenceDetails } from './EvidenceDetails';

export type RobotChoice = { id: string; name: string; href: string };
export function RobotPlanFit({ robot }: { robot: RobotChoice }) {
  const plan = usePlan();
  const router = useRouter();
  const assessment = useAssessment(plan.project, [robot.id]);
  const result = assessment.data?.results[0];
  const added = plan.project?.options.some((option) => option.robotId === robot.id);
  const full = (plan.project?.options.length ?? 0) >= 4;
  function add() {
    const option = optionForRobot(robot);
    if (!plan.project) {
      const project = newProject(crypto.randomUUID());
      project.options = [option]; project.selectedOptionId = option.id;
      plan.addProject(project); router.push('/plan'); return;
    }
    if (!added && !full) plan.updateProject(plan.project.id, (current) => ({ ...current, options: [...current.options, option], selectedOptionId: option.id, gate: 'unknown' }));
  }
  return <section className="card mb-6 p-5 sm:p-6" aria-label="Fit for your job">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div className="max-w-2xl"><p className="eyebrow">Fit for your job</p><h2 className="mt-2 text-xl font-semibold">{plan.project ? plan.project.title || 'Your automation opportunity' : 'Could this robot help with your work?'}</h2>
        <p className="mt-3 text-sm text-muted">{!plan.project ? 'Define a construction or factory job, then compare the complete setup, costs and evidence.' : result ? result.blocked ? 'A published requirement does not match. Review the constraint before considering this setup.' : result.open ? 'Some requirements remain unconfirmed. Review the tooling, workflow and human responsibilities.' : 'Published requirements match. The complete application still needs confirmation.' : assessment.loading ? 'Checking the selected job requirements…' : 'Choose a job and its requirements to assess this robot.'}</p>
      </div>
      <div className="flex flex-wrap gap-2"><button type="button" className={ui.btn} disabled={!plan.ready || added || full} onClick={add}>{added ? 'Added to assessment' : full ? 'Assessment full' : 'Add to my assessment'}</button><Link href="/plan" className={ui.btnSecondary}>{plan.project ? 'Open assessment' : 'Explore jobs'}</Link></div>
    </div>
    {assessment.error ? <p className="mt-3 text-sm" role="alert">{assessment.error} <button className="underline" onClick={assessment.retry}>Retry</button></p> : null}
    {assessment.data?.missing.length ? <p className="mt-3 text-sm text-muted">This configuration is not currently available for screening in the public catalogue.</p> : null}
    {result ? <EvidenceDetails result={result} /> : null}
  </section>;
}
