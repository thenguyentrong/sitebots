import { notFound } from 'next/navigation';
import { isFocusedReview } from '@/lib/browse-scope';
import { loadSolutionReviews } from '@/lib/solutions/load';
import { reviewSoldInGermany } from '@/lib/market/links';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CustomCheck } from '@/components/journey/CustomCheck';
import { StationHead } from '@/components/journey/StationHead';
import { Steps } from '@/components/journey/Steps';
import { loadContent } from '@/lib/content/load';
import { PRIVATE_METADATA } from '@/lib/seo';
import { RESEARCHED_TASKS } from '@/lib/discovery/researched-tasks';
import { INDUSTRY_IDS } from '@/lib/content/industries';
import { workflowById } from '@/lib/solutions/workflows';
import { journeyContent } from '@/lib/tasks/cards';
import '../../plan/plan.css';
import '../../plan/journey.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { ...PRIVATE_METADATA, title: 'Check a task of your own' };
type Search = Promise<Record<string, string | string[] | undefined>>;

/** Step 2 for work the library does not hold: the same requirement review on the visitor's own answers. */
export default async function CustomTaskPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const project = Array.isArray(sp.project) ? sp.project[0] : sp.project;
  const workflow = workflowById(Array.isArray(sp.workflow) ? sp.workflow[0] : sp.workflow ?? '');
  const focusedIds = new Set(loadSolutionReviews().filter(isFocusedReview).filter(review => reviewSoldInGermany(review.id)).map(review => review.id));
  const opportunity = RESEARCHED_TASKS.find(point => point.id === sp.opportunity && point.reviewLinks?.some(link => focusedIds.has(link.reviewId)));
  if (sp.opportunity && !opportunity) notFound();
  const requestedIndustry = INDUSTRY_IDS.find(value => value === sp.industry);
  const industry = opportunity ? (requestedIndustry && opportunity.industries.includes(requestedIndustry) ? requestedIndustry : opportunity.industries[0]) : requestedIndustry;
  return <main className="jp-page plan-page">
    <Steps />
    <StationHead title="Check a task of your own" lede={<>For work in any industry. Describe your process and requirements, then explore possible approaches; <Link className="jp-link text-foreground" href="/use-cases/criteria">how they work</Link>.</>} />
    <div className="jp-body"><CustomCheck key={(project ?? '') + ':' + (workflow?.id ?? '') + ':' + (industry ?? '') + ':' + (opportunity?.id ?? '')} content={journeyContent(loadContent())} projectId={project ?? ''} workflow={workflow} initialIndustry={industry} opportunity={opportunity} /></div>
  </main>;
}
