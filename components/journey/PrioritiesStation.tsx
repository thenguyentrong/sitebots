'use client';

import { PriorityEditor } from '@/components/plan/PriorityEditor';
import type { JourneyContent } from '@/lib/tasks/types';
import { ProjectSwitcher } from './ProjectSwitcher';
import { StationHead, StationNext } from './StationHead';
import { useJourneyProject } from './useJourneyProject';

export function PrioritiesStation({ content: _content }: { content: JourneyContent }) {
  const { plan, project, update } = useJourneyProject();
  const projects = plan.workspace?.projects ?? [];
  return <><StationHead title="Which task first?" lede="Rate business value and readiness for every task. These are your planning judgments; product suitability still needs evidence." />
    <div className="jp-body"><ProjectSwitcher />{project ? <>
      <PriorityEditor project={project} projects={projects} update={update} select={plan.selectProject} />
      <StationNext href="/plan/systems" label="Continue to solutions" />
    </> : null}</div>
  </>;
}
