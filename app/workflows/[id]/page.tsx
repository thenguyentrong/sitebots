import { isFocusedReview } from '@/lib/browse-scope';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Steps } from '@/components/journey/Steps';
import { ReviewCard } from '@/components/solutions/ReviewCard';
import { INDUSTRIES, INDUSTRY_IDS } from '@/lib/content/industries';
import { loadSolutionReviews } from '@/lib/solutions/load';
import { workflowById } from '@/lib/solutions/workflows';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';
import '../../plan/plan.css';
import '../../plan/journey.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const workflow = workflowById(id);
  if (!workflow) notFound();
  return publicMetadata({
    title: `${workflow.title}: workflow guide`,
    description: workflow.summary,
    path: `/workflows/${workflow.id}`,
  });
}
export default async function WorkflowPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ industry?: string }> }) {
  const { id } = await params;
  const workflow = workflowById(id);
  if (!workflow) notFound();
  const { industry: selectedIndustry } = await searchParams;
  const industry = INDUSTRY_IDS.find((value) => value === selectedIndustry);
  const query = industry ? '&industry=' + industry : '';
  const reviews = loadSolutionReviews().filter(isFocusedReview).filter((r) => r.workflowId === id && (!industry || r.industries?.includes(industry)));
  if (!reviews.length) notFound();
  return <main className="jp-page plan-page"><Steps />
    <nav className="pt-6 text-sm"><Link className={ui.link} href="/use-cases">Use cases</Link> / Workflow guide</nav>
    <header className="jp-head"><p className="eyebrow">{workflow.industries.map((id) => INDUSTRIES[id].en).join(' · ')}</p><h1>{workflow.title}</h1><p className="jp-lede">{workflow.summary}</p><p className="jp-small mt-3">A task template to adapt, with configuration reviews linked below. Applicability is editorial; your workplace still needs assessment.</p>
      <div className="jp-actions mt-6"><Link className={ui.btn} href={'/use-cases/custom?workflow=' + workflow.id + query}>Make this task mine</Link><Link className={ui.btnSecondary} href={'/solutions?workflow=' + workflow.id + query}>Compare published evidence</Link></div>
    </header>
    <div className="jp-body"><section className="jp-card"><div className="jp-card-head"><h2>Define the outcome</h2><p>{workflow.outcome}</p></div><ol className="grid gap-3 sm:grid-cols-2">{workflow.process.map((step, i) => <li key={step} className="rounded-lg border border-edge p-4 text-sm"><span className="mr-2 font-semibold">{i + 1}.</span>{step}</li>)}</ol></section>
    <section className="jp-card"><div className="jp-card-head"><h2>Make it specific to your company</h2><p>The template does not assume your load, floor, runtime or operating conditions.</p></div><ul className="list-disc space-y-3 pl-5 text-sm">{workflow.questions.map((question) => <li key={question}>{question}</li>)}</ul></section>
    <section aria-labelledby="workflow-reviews" className="space-y-4"><h2 id="workflow-reviews" className="text-xl font-semibold">{reviews.length} configuration reviews</h2><p className="text-sm text-muted">Product claims, demonstrations and operating deployments have different evidential value. Missing measurements and conflicts remain visible.</p><div className="grid items-start gap-4 md:grid-cols-2">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div></section>
    <section className="jp-card"><div className="jp-card-head"><h2>What a pilot must establish</h2><p>{workflow.pilot}</p></div><Link className={ui.btn} href={'/use-cases/custom?workflow=' + workflow.id + query}>Start my assessment</Link></section></div>
  </main>;
}

