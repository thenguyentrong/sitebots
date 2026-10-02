import { isFocusedForm, isFocusedReview } from '@/lib/browse-scope';
import Link from 'next/link';
import { matchingReviews } from '@/lib/solutions/browse';
import { ReviewCard } from '@/components/solutions/ReviewCard';
import { INDUSTRIES, INDUSTRY_IDS, isIndustry } from '@/lib/content/industries';
import { loadSolutionReviews } from '@/lib/solutions/load';
import { STAGE_LABELS } from '@/lib/solutions/schema';
import { WORKFLOWS } from '@/lib/solutions/workflows';
import { FORM_FACTORS } from '@/lib/spec/enums';
import { FORM_FACTOR_LABEL } from '@/lib/spec/display';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';
import '../plan/plan.css';
import '../plan/journey.css';
export const dynamic = 'force-dynamic';
export const metadata = publicMetadata({ title: 'Reviewed configurations', path: '/solutions', description: 'Configuration-specific specifications, task evidence and buying routes, with source dates, conflicts and remaining questions.' });
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
export default async function SolutionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const query = one(sp.q);
  const industry = one(sp.industry), workflow = one(sp.workflow), robotClass = one(sp.robotClass), stage = one(sp.stage);
  const all = loadSolutionReviews().filter(isFocusedReview);
  const reviews = matchingReviews(all, robotClass, query).filter((r) => (!workflow || r.workflowId === workflow) && (!robotClass || (r.robotClass === robotClass || (robotClass === 'quadruped' && r.id === 'boston-dynamics-spot-arm-inspection'))) && (!stage || r.taskEvidence.some((e) => e.stage === stage)) && (!industry || (isIndustry(industry) && r.industries?.includes(industry))));
  const href = (patch: Record<string, string>) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries({ industry, workflow, robotClass, stage, q: query, ...patch })) if (v) q.set(k, v); return '/solutions' + (q.size ? '?' + q : ''); };
  return <main className="jp-page plan-page">
    <header className="jp-head"><p className="eyebrow">Evidence before selection</p><h1>Reviewed robot configurations</h1><p className="jp-lede">{all.length} configurations across {new Set(all.map(review => review.workflowId)).size} workflows. Read what the manufacturer states, what has been deployed, who offers it and what is still unresolved.</p><p className="jp-small mt-3">These source reviews are separate from the larger catalogue inventory. A reviewed record is not a site-suitability approval.</p></header>
    <div className="jp-body"><section className="jp-card" aria-label="Filter configuration reviews">
      <form action="/solutions" method="get" className="mb-6 flex flex-wrap items-end gap-3">
        {Object.entries({ industry, workflow, robotClass, stage }).filter(([, value]) => value).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm font-medium">Search reviewed robots<input className={ui.input} type="search" name="q" defaultValue={query} placeholder="H2 Plus, TRON, Unitree…" /></label><button className={ui.btn} type="submit">Search</button>
      </form>
      <div className="grid gap-6">
        <div><h2 className="jp-h3 mb-3">Industry applicability</h2><div className="chips" role="group" aria-label="Industry"><Link href={href({ industry: '' })} aria-current={!industry ? 'true' : undefined}>All industries</Link>{INDUSTRY_IDS.map((id) => <Link key={id} href={href({ industry: industry === id ? '' : id })} aria-current={industry === id ? 'true' : undefined}>{INDUSTRIES[id].en}</Link>)}</div></div>
        <div><h2 className="jp-h3 mb-3">Workflow</h2><div className="chips" role="group" aria-label="Workflow"><Link href={href({ workflow: '' })} aria-current={!workflow ? 'true' : undefined}>All workflows</Link>{WORKFLOWS.filter(w => all.some(review => review.workflowId === w.id)).map((w) => <Link key={w.id} href={href({ workflow: workflow === w.id ? '' : w.id })} aria-current={workflow === w.id ? 'true' : undefined}>{w.title}</Link>)}</div></div>
        <div><h2 className="jp-h3 mb-3">Robot class</h2><div className="chips" role="group" aria-label="Robot class"><Link href={href({ robotClass: '' })} aria-current={!robotClass ? 'true' : undefined}>All classes</Link>{FORM_FACTORS.filter((id) => isFocusedForm(id) && all.some((r) => r.robotClass === id)).map((id) => <Link key={id} href={href({ robotClass: robotClass === id ? '' : id })} aria-current={robotClass === id ? 'true' : undefined}>{id === 'quadruped' ? 'Robot dogs' : FORM_FACTOR_LABEL[id]}</Link>)}</div></div>
        <div><h2 className="jp-h3 mb-3">Published task evidence</h2><div className="chips" role="group" aria-label="Task evidence"><Link href={href({ stage: '' })} aria-current={!stage ? 'true' : undefined}>All stages</Link>{Object.entries(STAGE_LABELS).map(([id, label]) => <Link key={id} href={href({ stage: stage === id ? '' : id })} aria-current={stage === id ? 'true' : undefined}>{label}</Link>)}</div></div>
      </div>
    </section>
    <div className="jp-results"><p className="jp-h3" data-testid="review-count">{reviews.length} configurations</p><Link className={ui.link} href="/solutions">Clear filters</Link></div>
    {reviews.length ? <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <section className="jp-card"><h2 className="jp-h3">No reviewed configurations for this selection yet</h2><p className="jp-muted mt-2">This is a coverage gap. Start with a custom task or broaden the filters.</p><Link className={ui.btnSecondary + ' mt-4'} href="/use-cases/custom">Describe my task</Link></section>}
    <p className="jp-small">Industry applicability groups related work; a deployment in one setting does not verify another. German buying routes are published supplier claims, with delivery, authorization and support gaps retained.</p>
    </div>
  </main>;
}

