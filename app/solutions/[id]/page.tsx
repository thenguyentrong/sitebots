import { loadDiscoveryPoints } from '@/lib/discovery/load';
import { candidateReviewIds } from '@/lib/discovery/model';
import { isFocusedReview } from '@/lib/browse-scope';
import { RESEARCHED_TASKS } from '@/lib/discovery/researched-tasks';
import { ProductPicture } from '@/components/solutions/ProductPicture';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadSolutionReviews } from '@/lib/solutions/load';
import { STAGE_LABELS, type SolutionReview } from '@/lib/solutions/schema';
import { workflowById } from '@/lib/solutions/workflows';
import { FORM_FACTOR_LABEL } from '@/lib/spec/display';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';
import '../../plan/plan.css';
import '../../plan/journey.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const review = loadSolutionReviews().filter(isFocusedReview).find((record) => record.id === id);
  if (!review) notFound();
  return publicMetadata({
    title: `${review.name}: specifications and task evidence`,
    description: `Specifications, task evidence and German buying routes for ${review.name}. Review the exact configuration, source dates, conflicts and remaining gaps.`,
    path: `/solutions/${review.id}`,
  });
}
function Sources({ review, ids }: { review: SolutionReview; ids: string[] }) {
  return <span className="inline-flex flex-wrap gap-x-3 gap-y-1">{ids.map((id) => { const source = review.sources.find((s) => s.id === id)!; return <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{source.publisher} · {source.retrievalMode.replaceAll('_', ' ')} · {source.checkedAt}</a>; })}</span>;
}
export default async function SolutionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ usecase?: string }> }) {
  const { id } = await params;
  const review = loadSolutionReviews().filter(isFocusedReview).find((r) => r.id === id);
  if (!review) notFound();
  const workflow = workflowById(review.workflowId)!;
  const relatedJobs = loadDiscoveryPoints().filter(point => candidateReviewIds(point).includes(review.id));
  const { usecase } = await searchParams;
  const opportunity = RESEARCHED_TASKS.find(point => point.id === usecase && point.reviewLinks?.some(link => link.reviewId === review.id));
  const assessmentHref = opportunity ? '/use-cases/custom?opportunity=' + encodeURIComponent(opportunity.id) : '/use-cases/custom?workflow=' + review.workflowId;
  return <main className="jp-page plan-page">
    <nav className="pt-8 text-sm"><Link className={ui.link} href="/solutions">Reviewed configurations</Link> / {review.name}</nav>
    <header className="jp-head"><p className="eyebrow">{review.manufacturer} · {FORM_FACTOR_LABEL[review.robotClass]}</p><h1>{review.name}</h1><p className="jp-lede">{review.description}</p><p className="jp-small mt-4">Checked {review.checkedAt} · {review.reviewStatus.replaceAll('_', ' ')} · Suitability for your site remains unconfirmed.</p><div className="jp-actions mt-6"><Link className={ui.btn} href={assessmentHref}>{opportunity ? 'Assess this use case' : 'Assess this type of work'}</Link><Link className={ui.btnSecondary} href={'/workflows/' + review.workflowId}>{workflow.title}</Link></div></header>
    <div className="jp-body">
    <ProductPicture reviewId={review.id} formFactor={review.robotClass} />
    <section className="jp-card" aria-labelledby="robot-job-options"><div className="jp-card-head"><h2 id="robot-job-options">Jobs to explore with this robot</h2><p>One robot can be considered for several jobs. Task evidence and potential integrations are shown separately.</p></div><div className="grid gap-3 sm:grid-cols-2">{relatedJobs.map(job => <Link key={job.id} href={'/?usecase=' + encodeURIComponent(job.id) + '&view=map#explore'} className="rounded-xl border border-edge p-4 text-sm hover:bg-subtle" data-related-job={job.id}><span className="mb-2 block text-xs text-muted">{job.reviewIds.includes(review.id) ? 'Task-linked evidence' : 'Potential integration'}</span><strong>{job.title}</strong><span aria-hidden="true"> →</span></Link>)}</div></section>
    <section className="jp-card" aria-labelledby="exact-config"><div className="jp-card-head"><h2 id="exact-config">Exact configuration and scope</h2><p>{review.exactConfiguration}</p></div><p className="text-sm"><strong>Operating mode: </strong>{review.operatingMode.value}</p><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">{review.operatingMode.caveats.map((c) => <li key={c}>{c}</li>)}</ul><p className="mt-3 text-xs text-muted"><Sources review={review} ids={review.operatingMode.sourceIds} /></p></section>
    <section className="jp-card" aria-labelledby="review-specs"><div className="jp-card-head"><h2 id="review-specs">Published specifications</h2><p>Measurement meaning and conditions travel with each value. Manufacturer-stated specifications do not establish the performance of an integrated application.</p></div>
      <dl className="grid gap-5 md:grid-cols-2">{review.specs.map((spec, index) => <div key={spec.key + index} className="rounded-xl border border-edge p-4" data-spec-key={spec.key}><dt className="font-medium">{spec.semanticLabel}</dt><dd className="mt-2 text-xl font-semibold">{spec.value === null ? 'Not established' : typeof spec.value === 'boolean' ? spec.value ? 'Yes' : 'No' : String(spec.value)}{spec.value !== null && spec.unit ? ' ' + spec.unit : ''}</dd><dd className="mt-1 text-xs text-muted">{spec.verification === 'manufacturer_supported' ? 'Manufacturer-stated' : spec.verification === 'reported' ? 'Reported' : 'Unknown'}</dd>{spec.conditions.length ? <dd><ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">{spec.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></dd> : null}<dd className="mt-3 text-xs text-muted"><Sources review={review} ids={spec.sourceIds} /></dd></div>)}</dl>
    </section>
    <section className="jp-card" aria-labelledby="task-proof"><div className="jp-card-head"><h2 id="task-proof">Evidence for the task</h2><p>Stage describes what the publication reports. Read who published it, the exact setup and any missing measurements.</p></div>
      <div className="space-y-5">{review.taskEvidence.map((evidence, index) => <article key={index} className="border-l-2 border-edge pl-4"><p className="text-xs font-semibold">{STAGE_LABELS[evidence.stage]}</p><h3 className="mt-2 font-medium">{evidence.task}</h3><p className="mt-2 text-sm">{evidence.configuration}</p><p className="mt-2 text-sm text-muted">Operation: {evidence.operatingMode}</p><ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">{evidence.limitations.map((limit) => <li key={limit}>{limit}</li>)}</ul><p className="mt-3 text-xs text-muted"><Sources review={review} ids={evidence.sourceIds} /></p></article>)}</div>
    </section>
    <section className="jp-card" aria-labelledby="buying-routes"><div className="jp-card-head"><h2 id="buying-routes">Buying, integration and support routes</h2><p>Published business contacts; no enquiry has been sent. Ask for the exact configuration, delivery market, installation scope and service terms.</p></div>
      <div className="grid gap-4 md:grid-cols-2">{review.buyingRoutes.map((route, index) => <article key={index} className="rounded-xl border border-edge p-4"><h3 className="font-semibold">{route.organization}</h3><p className="mt-1 text-xs text-muted">{route.market} · {route.routeType} · checked {route.checkedAt}</p><div className="mt-3 flex flex-col items-start gap-2 break-all text-sm">{route.contact.url ? <a href={route.contact.url} target="_blank" rel="noopener noreferrer" className={ui.link}>Published contact / offer</a> : null}{route.contact.email ? <a className={ui.link} href={'mailto:' + route.contact.email}>{route.contact.email}</a> : null}{route.contact.phone ? <a className={ui.link} href={'tel:' + route.contact.phone.replace(/[^+\d]/g, '')}>{route.contact.phone}</a> : null}</div><p className="mt-3 text-sm"><strong>Supply: </strong>{route.deliveryStatus}</p><p className="mt-2 text-sm"><strong>Authorization: </strong>{route.authorizationStatus}</p><ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted">{route.caveats.map((c) => <li key={c}>{c}</li>)}</ul><p className="mt-3 text-xs text-muted"><Sources review={review} ids={route.sourceIds} /></p></article>)}</div>
    </section>
    {review.conflicts.length ? <section className="jp-card" aria-labelledby="source-conflicts"><div className="jp-card-head"><h2 id="source-conflicts">Conflicts and identity checks</h2><p>These claims have not been averaged or silently reconciled.</p></div><ul className="list-disc space-y-3 pl-5 text-sm">{review.conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul></section> : null}
    <section className="jp-card" aria-labelledby="open-evidence"><div className="jp-card-head"><h2 id="open-evidence">Still to establish</h2></div><ul className="list-disc space-y-3 pl-5 text-sm">{review.unknowns.map((unknown) => <li key={unknown}>{unknown}</li>)}</ul></section>
    <details className="jp-details"><summary>Full source ledger ({review.sources.length})</summary><ul className="mt-4 space-y-3">{review.sources.map((source) => <li key={source.id} className="break-words text-sm"><a className={ui.link} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><p className="mt-1 text-xs text-muted">{source.publisher} · {source.kind} · {source.retrievalMode.replaceAll('_', ' ')} · checked {source.checkedAt}</p></li>)}</ul></details>
    </div>
  </main>;
}

