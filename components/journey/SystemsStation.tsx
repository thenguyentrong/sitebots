'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SolutionPicker } from '@/components/plan/SolutionPicker';
import { checkHref } from '@/lib/journey/stations';
import { screenForSite } from '@/lib/plan/screen';
import { formatMessage } from '@/lib/screen/messages';
import type { JourneyContent } from '@/lib/tasks/types';
import { ProjectSwitcher } from './ProjectSwitcher';
import { StationHead } from './StationHead';
import { VerdictBadge } from './VerdictBadge';
import { useJourneyProject } from './useJourneyProject';

/** Decide: which complete solution. The catalogue comparison, entered from a checked task. */
export function SystemsStation({ content }: { content: JourneyContent }) {
  const { plan, project, update } = useJourneyProject();
  const router = useRouter();
  const result = project ? screenForSite(project, content.machineClassFamilies) : null;
  const label = (id: string) => content.solutionClasses[id]?.en ?? id;
  return <>
    <StationHead title="Which complete solution?" lede="Compare complete solutions for the task, humanoid or not, with the evidence next to every value." />
    <div className="jp-body">
      <ProjectSwitcher />
      {project && result ? <>
        <div className="jp-notice flex flex-wrap items-center gap-3 plan-screen" data-testid="systems-verdict"><VerdictBadge verdict={result.verdict} />
          {result.verdict === 'ruled_out' ? <span>{formatMessage(result.better_answer.message)} The catalogue below is for comparison only.</span>
            : result.verdict === 'unscreened' ? <span>The check has open questions. <Link className="jp-link" href={checkHref(project)}>Answer them first</Link>, then compare solutions.</span>
            : <span>Compare, in this order: {result.suggested_solution_classes.map(label).join(', ') || 'a wheeled mobile manipulator, a humanoid'}.</span>}
        </div>
        <SolutionPicker key={project.id} project={project} update={update} next={() => router.push('/plan/implementation')} />
      </> : null}
    </div>
  </>;
}
