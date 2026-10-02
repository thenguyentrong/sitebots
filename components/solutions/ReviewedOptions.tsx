'use client';
import Link from 'next/link';
import type { Project } from '@/lib/plan/model';
import { optionFromReview, reviewsForProject } from '@/lib/solutions/plan';
import type { SolutionReview } from '@/lib/solutions/schema';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { ReviewCard } from './ReviewCard';

export function ReviewedOptions({ reviews, project, update }: { reviews: SolutionReview[]; project: Project; update: (patch: Partial<Project>) => void }) {
  const related = reviewsForProject(reviews, project);
  if (!related.length) return <p className="jp-notice">No configuration review is linked to this task yet. <Link className="jp-link" href="/solutions">Explore the reviewed configurations</Link> or add a custom option below.</p>;
  return <section className="space-y-4" aria-labelledby="reviewed-options">
    <div><h2 id="reviewed-options" className="text-xl font-semibold">Configurations reviewed for related work</h2><p className="mt-2 text-sm text-muted">These are research candidates for the selected work. Their published specifications and deployment reports are research inputs; exact task fit, integration and local supply still need confirmation.</p></div>
    <div className="grid items-start gap-4 md:grid-cols-2">{related.map((review) => {
      const added = project.options.some((o) => o.solutionReviewId === review.id);
      const full = project.options.length >= 4;
      return <div key={review.id} className="space-y-2"><ReviewCard review={review} /><button className={cn(ui.btnSecondary, 'h-auto min-h-10 w-full whitespace-normal py-2 text-center')} disabled={added || full} onClick={() => {
        if (added || full) return;
        const option = optionFromReview(review, project.task?.kind === 'library' ? project.task.snapshot.id : project.task?.kind === 'custom' ? project.task.opportunityId : undefined);
        update({ options: [...project.options, option], selectedOptionId: option.id, gate: 'unknown', gateNote: '', screenConfirmedAt: '' });
      }}>{added ? 'Added to comparison' : full ? 'Comparison full (4)' : 'Compare ' + review.name}</button></div>;
    })}</div>
  </section>;
}

