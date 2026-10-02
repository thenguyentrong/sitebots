'use client';

import { isFocusedSolutionClass } from '@/lib/browse-scope';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReviewedOptions } from '@/components/solutions/ReviewedOptions';
import type { SolutionReview } from '@/lib/solutions/schema';
import { SolutionPicker } from '@/components/plan/SolutionPicker';
import { checkHref } from '@/lib/journey/stations';
import { reviewForSite } from '@/lib/plan/screen';
import type { JourneyContent } from '@/lib/tasks/types';
import { OpportunityStatus } from './OpportunityResult';
import { ProjectSwitcher } from './ProjectSwitcher';
import { StationHead } from './StationHead';
import { useJourneyProject } from './useJourneyProject';

export function SystemsStation({ content, reviews = [] }: { content: JourneyContent; reviews?: SolutionReview[] }) {
  const { project, update } = useJourneyProject();
  const router = useRouter();
  const result = project ? reviewForSite(project, content.machineClassFamilies) : null;
  return <><StationHead title="Which complete solution?" lede="Compare complete solutions for the task, with configuration-specific evidence next to every value." />
    <div className="jp-body"><ProjectSwitcher />{project && result ? <>
      <div className="jp-notice space-y-2 plan-screen" data-testid="systems-review"><OpportunityStatus result={result} />
        <p>Approaches to investigate: {result.solutionClasses.filter(option => isFocusedSolutionClass(option.id)).map((o) => content.solutionClasses[o.id]?.en ?? o.id).join(', ')}.</p>
        <p>Compare options now and <Link className="jp-link" href={checkHref(project)}>refine the task requirements</Link>. Missing evidence remains an open question.</p>
      </div>
      <ReviewedOptions reviews={reviews} project={project} update={update} />
      <SolutionPicker key={project.id} project={project} update={update} next={() => router.push('/plan/implementation')} />
    </> : null}</div>
  </>;
}
