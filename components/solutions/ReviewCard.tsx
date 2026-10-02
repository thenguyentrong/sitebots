import { ProductPicture } from '@/components/solutions/ProductPicture';
import Link from 'next/link';
import { FORM_FACTOR_LABEL } from '@/lib/spec/display';
import { STAGE_LABELS, type SolutionReview } from '@/lib/solutions/schema';

export function ReviewCard({ review }: { review: SolutionReview }) {
  return <article className="card flex flex-col gap-3 p-5" data-review-id={review.id}>
    <ProductPicture reviewId={review.id} formFactor={review.robotClass} />
    <p className="text-xs text-muted">{review.manufacturer} · {review.id === 'boston-dynamics-spot-arm-inspection' ? 'Robot dog with arm' : review.robotClass === 'quadruped' ? 'Robot dog' : FORM_FACTOR_LABEL[review.robotClass]}</p>
    <h3 className="text-lg font-semibold"><Link className="hover:underline" href={'/solutions/' + review.id}>{review.name}</Link></h3>
    <p className="text-sm">{review.description}</p>
    <p className="text-xs text-muted">Configuration: {review.exactConfiguration}</p>
    <div className="flex flex-wrap gap-2">{[...new Set(review.taskEvidence.map((e) => STAGE_LABELS[e.stage]))].map((label) => <span key={label} className="rounded-full border border-edge px-3 py-1 text-xs">{label}</span>)}</div>
    <p className="text-xs text-muted">{review.specs.filter((s) => s.verification === 'manufacturer_supported').length} manufacturer-stated specifications · {review.conflicts.length} recorded conflicts · {review.unknowns.length} open questions</p>
    <p className="text-xs text-muted">Reviewed {review.checkedAt}. Fit for your site remains unconfirmed.</p>
    <Link className="mt-auto text-sm font-medium underline underline-offset-4" href={'/solutions/' + review.id}>Read evidence and buying routes →</Link>
  </article>;
}

