import { ALL_REVIEWED_TASK_LINKS as REVIEWED_TASK_LINKS } from '@/lib/discovery/task-context';
import { reviewIdsForTask } from '@/lib/discovery/matching';
import { OptionSchema, emptyCosts, type PlanOption, type Project } from '@/lib/plan/model';
import { familyOf } from '@/lib/plan/screen';
import type { SolutionReview } from './schema';
import { STAGE_LABELS } from './schema';
import { workflowsForFamily } from './workflows';

export function reviewsForProject(reviews: SolutionReview[], project: Project): SolutionReview[] {
  const task = project.task;
  if (task?.kind === 'library') {
    const ids = new Set([...reviewIdsForTask(task.snapshot, reviews), ...REVIEWED_TASK_LINKS.filter((link) => link.taskId === task.snapshot.id).map((link) => link.reviewId)]);
    return reviews.filter((review) => ids.has(review.id));
  }
  if (task?.kind === 'custom' && task.opportunityId) {
    const ids = new Set(REVIEWED_TASK_LINKS.filter(link => link.taskId === task.opportunityId).map(link => link.reviewId));
    return reviews.filter(review => ids.has(review.id) && (!task.industry || review.industries.includes(task.industry)));
  }
  if (task?.kind === 'custom' && task.workflowId) return reviews.filter((review) => review.workflowId === task.workflowId && (!task.industry || review.industries?.includes(task.industry)));
  const ids = new Set(workflowsForFamily(familyOf(project)).map((w) => w.id));
  return reviews.filter((r) => ids.has(r.workflowId) && (task?.kind !== 'custom' || !task.industry || r.industries?.includes(task.industry)));
}

/** A reviewed product becomes an option to assess, never an automatically approved robot. */
export function optionFromReview(review: SolutionReview, taskId?: string): PlanOption {
  const evidence = [
    'Configuration evidence checked ' + review.checkedAt + '. Site-specific suitability remains unconfirmed.',
    ...review.taskEvidence.map((e) => STAGE_LABELS[e.stage] + ': ' + e.task),
    ...review.taskEvidence.flatMap((entry) => ['Evidence setup: ' + entry.configuration, ...entry.limitations.map((limit) => 'Task limit: ' + limit)]),
    ...REVIEWED_TASK_LINKS.filter((link) => link.taskId === taskId && link.reviewId === review.id).flatMap((link) => [link.relationship === 'partial_task' ? 'PARTIAL TASK SUPPORT: ' + link.rationale : 'Task relationship: ' + link.rationale, ...link.limitations.map((limit) => 'Task boundary: ' + limit)]),
    ...review.conflicts.map((conflict) => 'Unresolved source conflict: ' + conflict),
    ...review.sources.map((s) => s.title + ' (' + s.retrievalMode + '): ' + s.url),
    'Open questions: ' + review.unknowns.join(' '),
  ].join('\n');
  // Reject oversized future imports during the registry check; never cut a source URL.
  return OptionSchema.parse({
    id: 'review:' + review.id, solutionReviewId: review.id, name: review.name, kind: 'custom', href: '/solutions/' + review.id,
    package: review.exactConfiguration, operator: [review.operatingMode.value, ...review.operatingMode.caveats].join(' '),
    evidence, costs: emptyCosts(),
  });
}

