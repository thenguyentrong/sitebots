import { ALL_REVIEWED_TASK_LINKS as REVIEWED_TASK_LINKS } from '../lib/discovery/task-context';
import { loadSolutionReviews } from '../lib/solutions/load';
import { optionFromReview } from '../lib/solutions/plan';
import { WORKFLOW_IDS } from '../lib/solutions/workflows';

// A read-only publication check; no network refresh and no database connection.
const reviews = loadSolutionReviews();
for (const review of reviews) {
  optionFromReview(review);
  for (const link of REVIEWED_TASK_LINKS.filter((entry) => entry.reviewId === review.id)) optionFromReview(review, link.taskId);
}
const countBy = (values: string[]) => Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]));
console.log(JSON.stringify({
  configurationReviews: reviews.length,
  workflows: Object.fromEntries(WORKFLOW_IDS.map((workflow) => [workflow, reviews.filter((review) => review.workflowId === workflow).length])),
  classes: countBy(reviews.map((review) => review.robotClass)),
  specificationEvidence: countBy(reviews.flatMap((review) => review.specs.map((spec) => spec.verification))),
  evidenceStages: countBy(reviews.flatMap((review) => review.taskEvidence.map((evidence) => evidence.stage))),
  uniqueSourceURLs: new Set(reviews.flatMap((review) => review.sourceURLs)).size,
  contacts: reviews.reduce((count, review) => count + review.buyingRoutes.length, 0),
  conflicts: reviews.reduce((count, review) => count + review.conflicts.length, 0),
  openQuestions: reviews.reduce((count, review) => count + review.unknowns.length, 0),
  qualification: 'Source integrity and saved-plan compatibility checked. Task suitability, current stock and delivery remain unconfirmed.',
}, null, 2));
