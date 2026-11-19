import { RobotSection } from '@/components/robot/RobotSection';
import { Badge } from '@/components/ui/badge';
import { COMMON } from '@/lib/i18n/common';
import { recordLang, type Lang } from '@/lib/i18n/config';
import { REVIEWS_TEXT } from '@/lib/i18n/robot';
import { requestLang } from '@/lib/i18n/server';
import { reviewsFor, type Review } from '@/lib/market/reviews';

const STANCE: Record<Review['stance'], 'success' | 'warn' | 'neutral'> = { positive: 'success', mixed: 'neutral', negative: 'warn' };
const SHOWN = 4;

type Item = ReturnType<typeof reviewsFor>[number];

/** Summaries and quotes come from data/market/reviews.json, written in English; they are marked as such. */
function ReviewItem({ review, lang }: { review: Item; lang: Lang }) {
  const t = REVIEWS_TEXT[lang];
  return <li className="space-y-2 px-5 py-4 text-sm">
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={STANCE[review.stance]}>{t.stance[review.stance]}</Badge>
      <span className="text-xs text-muted">{t.kind[review.kind]}</span>
      <a href={review.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium underline underline-offset-4">{review.publisher}</a>
      {review.date ? <span className="num text-xs text-faint">{review.date}</span> : null}
    </div>
    <p lang={recordLang(lang)}>{review.summary}</p>
    <blockquote className="border-l-2 border-edge pl-3 text-muted">{t.open}<span lang={recordLang(lang)}>{review.quote}</span>{t.close}</blockquote>
    {review.series ? <p className="text-xs text-faint">{t.series}</p> : null}
  </li>;
}

/** What people outside the maker say about the robot: press, owners, forums, GitHub, each with the exact words and the page they are on.
 * Also on the company pages, so it reads the page's language itself. */
export function ReviewsSection({ ids }: { ids: string[] }) {
  const lang = requestLang();
  const t = REVIEWS_TEXT[lang];
  const reviews = reviewsFor(ids);
  return (
    <RobotSection id="reviews" title={t.title} empty={t.empty} aside={reviews.length ? <span className="text-xs text-faint">{t.found(reviews.length)}</span> : null}>
      {/* One element or nothing: RobotSection shows its empty line only when it gets no children. */}
      {reviews.length ? <>
        {COMMON[lang].englishOnly ? <p className="border-b border-edge/60 px-5 py-2 text-xs text-faint">{COMMON[lang].englishOnly}</p> : null}
        <ul className="divide-y divide-edge/60">{reviews.slice(0, SHOWN).map((review) => <ReviewItem key={review.url} review={review} lang={lang} />)}</ul>
        {reviews.length > SHOWN ? <details className="border-t border-edge/60">
          <summary className="cursor-pointer px-5 py-3 text-sm text-muted underline-offset-4 hover:underline">{t.more(reviews.length - SHOWN)}</summary>
          <ul className="divide-y divide-edge/60">{reviews.slice(SHOWN).map((review) => <ReviewItem key={review.url} review={review} lang={lang} />)}</ul>
        </details> : null}
      </> : undefined}
    </RobotSection>
  );
}
