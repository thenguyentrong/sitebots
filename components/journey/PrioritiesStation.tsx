'use client';

import { PriorityEditor } from '@/components/plan/PriorityEditor';
import { screenForSite } from '@/lib/plan/screen';
import type { JourneyContent } from '@/lib/tasks/types';
import { ProjectSwitcher } from './ProjectSwitcher';
import { StationHead, StationNext } from './StationHead';
import { useJourneyProject } from './useJourneyProject';

/** Decide: which task first. The value × readiness matrix over the tasks that survived the check; ruled-out tasks are listed, not ranked. */
export function PrioritiesStation({ content }: { content: JourneyContent }) {
  const { plan, project, update } = useJourneyProject();
  const projects = plan.workspace?.projects ?? [];
  const verdictOf = (id: string) => screenForSite(projects.find((p) => p.id === id)!, content.machineClassFamilies).verdict;
  const surviving = projects.filter((p) => verdictOf(p.id) !== 'ruled_out');
  const ruledOut = projects.filter((p) => verdictOf(p.id) === 'ruled_out');
  return <>
    <StationHead title="Which task first?" lede="Rate business value against deployment readiness for the tasks that survived the check. The map shows which one to pilot first." />
    <div className="jp-body">
      <ProjectSwitcher />
      {ruledOut.length ? <p className="jp-muted" data-testid="ruled-out-note">Ruled out in the check and kept as decisions, not ranked: {ruledOut.map((p) => p.title || 'Untitled task').join(' · ')}.</p> : null}
      {project ? <>
        {verdictOf(project.id) === 'ruled_out' ? <p className="jp-notice">This task was ruled out. Its better answer is the decision; rate it only if you still want it on the map.</p> : null}
        <PriorityEditor project={project} projects={surviving.length ? surviving : projects} update={update} select={plan.selectProject} />
        <StationNext href="/plan/systems" label="Continue to solutions" />
      </> : null}
    </div>
  </>;
}
