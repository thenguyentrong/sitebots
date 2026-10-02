import { isFocusedReview } from '@/lib/browse-scope';
import type { SolutionReview } from './schema';

const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/h2plus/g, 'h2 plus').replace(/\+/g, ' plus ').replace(/[^a-z0-9]+/g, ' ').trim();
export function matchingReviews(reviews: SolutionReview[], form = '', query = ''): SolutionReview[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return reviews.filter(isFocusedReview).filter(review => {
    const type = review.id === 'boston-dynamics-spot-arm-inspection' ? 'quadruped' : review.robotClass;
    if (form && form !== type) return false;
    const text = normalize([review.name, review.manufacturer].join(' '));
    return terms.every(term => text.split(' ').some(word => word.startsWith(term)));
  });
}
