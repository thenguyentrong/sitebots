import { candidateReviewIds, type OpportunityPoint } from './discovery/model';
import type { SolutionReview } from './solutions/schema';

// Current product scope: keep the wider research archive, but publish humanoids, robot dogs and mobile manipulators.
export const FOCUSED_FORM_FACTORS = ['humanoid', 'quadruped', 'mobile_manipulator'] as const;
export function isFocusedForm(form: string | null | undefined): boolean {
  return FOCUSED_FORM_FACTORS.some(candidate => candidate === form);
}
export function isFocusedReview(review: Pick<SolutionReview, 'id' | 'robotClass'>): boolean {
  // Adding an arm to Spot does not change the underlying four-legged platform.
  return isFocusedForm(review.robotClass) || review.id === 'boston-dynamics-spot-arm-inspection';
}
export function focusedDiscoveryPoints(points: OpportunityPoint[], reviews: SolutionReview[]): OpportunityPoint[] {
  const allowed = new Set(reviews.filter(isFocusedReview).map(review => review.id));
  return points.map(point => ({ ...point, reviewIds: point.reviewIds.filter(id => allowed.has(id)), reviewLinks: point.reviewLinks?.filter(link => allowed.has(link.reviewId)), platformMatches: point.platformMatches?.filter(match => allowed.has(match.reviewId)) }))
    .filter(point => candidateReviewIds(point).length > 0);
}

export function isFocusedSolutionClass(id: string): boolean {
  return ['humanoid', 'quadruped_inspection', 'mobile_manipulator_wheeled', 'keep_process', 'process_change'].includes(id);
}
