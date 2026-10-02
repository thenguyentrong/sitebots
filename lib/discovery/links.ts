import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { SolutionReview } from '@/lib/solutions/schema';

export const TaskReviewLinkSchema = z.object({
  taskId: z.string().min(1), reviewId: z.string().min(1),
  relationship: z.enum(['task_candidate', 'partial_task']), rationale: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).min(1), limitations: z.array(z.string().min(1)).min(1),
});
export type TaskReviewLink = z.infer<typeof TaskReviewLinkSchema>;
const BatchSchema = z.object({ schemaVersion: z.literal(1), links: z.array(TaskReviewLinkSchema) });

/** A task-specific citation is required; sharing a robot family never creates a match. */
export function validateTaskReviewLinks(links: TaskReviewLink[], reviews: readonly SolutionReview[], taskIds: ReadonlySet<string>): TaskReviewLink[] {
  const seen = new Set<string>();
  for (const link of links) {
    TaskReviewLinkSchema.parse(link);
    const key = link.taskId + ':' + link.reviewId;
    if (seen.has(key)) throw new Error('Duplicate task/review link: ' + key);
    seen.add(key);
    if (!taskIds.has(link.taskId)) throw new Error('Unknown task in reviewed link: ' + link.taskId);
    const review = reviews.find((entry) => entry.id === link.reviewId);
    if (!review) throw new Error('Unknown configuration in reviewed link: ' + link.reviewId);
    for (const id of link.sourceIds) {
      const source = review.sources.find((entry) => entry.id === id);
      if (!source || source.retrievalMode === 'blocked' || source.retrievalMode === 'unavailable') throw new Error('Unsupported task-link citation: ' + key + ' / ' + id);
    }
  }
  return links;
}
export function loadTaskReviewLinks(reviews: readonly SolutionReview[], taskIds: ReadonlySet<string>): TaskReviewLink[] {
  const dir = join(process.cwd(), 'data/discovery-links');
  const links = readdirSync(dir).filter((name) => name.endsWith('.json')).sort().flatMap((name) =>
    BatchSchema.parse(JSON.parse(readFileSync(join(dir, name), 'utf8').replace(/^\uFEFF/, ''))).links);
  return validateTaskReviewLinks(links, reviews, taskIds);
}
