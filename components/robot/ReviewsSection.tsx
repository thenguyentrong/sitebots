import { RobotSection } from '@/components/robot/RobotSection';
import { Badge } from '@/components/ui/badge';
import { reviewsFor, type Review } from '@/lib/market/reviews';

const KIND: Record<Review['kind'], string> = {
  press: 'Press',
  hands_on: 'Hands-on test',
  owner: 'Owner',
  customer: 'Customer',
  forum: 'Forum',
  study: 'Study',
  maker_testimonial: 'Quoted by the maker',
  reddit: 'Reddit',
  github: 'GitHub',
  ros_community: 'ROS community',
  hacker_news: 'Hacker News',
  blog: 'Blog',
  video: 'Video',
};
const STANCE: Record<Review['stance'], { label: string; variant: 'success' | 'warn' | 'neutral' }> = {
  positive: { label: 'Positive', variant: 'success' },
  mixed: { label: 'Mixed', variant: 'neutral' },
  negative: { label: 'Critical', variant: 'warn' },
};
const SHOWN = 4;

type Item = ReturnType<typeof reviewsFor>[number];

function ReviewItem({ review }: { review: Item }) {
  const stance = STANCE[review.stance];
  return <li className="space-y-2 px-5 py-4 text-sm">
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={stance.variant}>{stance.label}</Badge>
      <span className="text-xs text-muted">{KIND[review.kind]}</span>
      <a href={review.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium underline underline-offset-4">{review.publisher}</a>
      {review.date ? <span className="num text-xs text-faint">{review.date}</span> : null}
    </div>
    <p>{review.summary}</p>
    <blockquote className="border-l-2 border-edge pl-3 text-muted">“{review.quote}”</blockquote>
    {review.series ? <p className="text-xs text-faint">This review covers the whole product family, not only this configuration.</p> : null}
  </li>;
}

/** What people outside the maker say about the robot: press, owners, forums, GitHub, each with the exact words and the page they are on. */
export function ReviewsSection({ ids }: { ids: string[] }) {
  const reviews = reviewsFor(ids);
  return (
    <RobotSection id="reviews" title="Reviews and feedback" empty="No independent review found yet. We search press, forums, GitHub and customer reports." aside={reviews.length ? <span className="text-xs text-faint">{reviews.length} found</span> : null}>
      {reviews.length ? <ul className="divide-y divide-edge/60">{reviews.slice(0, SHOWN).map((review) => <ReviewItem key={review.url} review={review} />)}</ul> : null}
      {reviews.length > SHOWN ? <details className="border-t border-edge/60">
        <summary className="cursor-pointer px-5 py-3 text-sm text-muted underline-offset-4 hover:underline">Show {reviews.length - SHOWN} more</summary>
        <ul className="divide-y divide-edge/60">{reviews.slice(SHOWN).map((review) => <ReviewItem key={review.url} review={review} />)}</ul>
      </details> : null}
    </RobotSection>
  );
}
