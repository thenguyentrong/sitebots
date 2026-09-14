import Link from 'next/link';
import { PlanWorkspace } from '@/components/plan/PlanWorkspace';
import { RequirementForm } from '@/components/match/RequirementForm';
import { ResultList } from '@/components/match/ResultList';
import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import { loadCandidates } from '@/lib/match/candidates';
import { hasAnyRequirement, requirementsFromParams } from '@/lib/match/requirements';
import { rankRobots } from '@/lib/match/score';
import { HOME_DESCRIPTION, publicMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { TRUST_HINT } from '@/lib/spec/display';
import type { Trust } from '@/lib/spec/enums';
import { ui } from '@/lib/ui';
import './plan/plan.css';

export const dynamic = 'force-dynamic';
export const metadata = publicMetadata({ title: SITE.tagline, description: HOME_DESCRIPTION, path: '/', absoluteTitle: true });
type Search = Promise<Record<string, string | string[] | undefined>>;
const TRUSTS: Trust[] = ['verified', 'assessed', 'reported', 'unknown'];

export default async function Home({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const { req, issues, asked } = requirementsFromParams(sp);
  const active = asked && hasAnyRequirement(req);
  // Existing specification-search URLs remain usable; the main entry is one guided journey.
  if (!active && sp.details !== '1') {
    const requestedStep = Number(Array.isArray(sp.step) ? sp.step[0] : sp.step);
    const step = Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= 4 ? requestedStep : undefined;
    return <main className="plan-page finder-page">
      <noscript><p>This guided finder needs JavaScript to save your work in this browser. <Link className="underline" href="/?details=1#matcher">Search by specifications</Link></p></noscript>
      <PlanWorkspace surface="finder" mode={step ? undefined : 'explore'} initialStep={step ?? 1} />
    </main>;
  }

  const data = active ? await loadCandidates() : null;
  const output = data ? rankRobots(data.candidates, req, { usdToEur: data.usdToEur, limit: 30 }) : null;
  return <main id="matcher" className="mx-auto w-full max-w-6xl scroll-mt-32 px-4 py-10 sm:scroll-mt-20 sm:px-6">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Specification search</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{active ? 'Robots for your requirements' : 'Refine your requirements'}</h1><p className="mt-2 max-w-2xl text-sm text-muted">Fill in what you know. Review recorded matches and open questions. Your search is saved in this link.</p></div>
      <Link href="/" className={ui.btnSecondary}>Find a robot by job →</Link>
    </header>
    {issues.length ? <p className="mb-6 rounded-xl border border-safety/30 bg-safety-soft/60 px-4 py-2.5 text-sm">Ignored: {issues.join('; ')}</p> : null}
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:rounded-2xl"><RequirementForm key={JSON.stringify(req)} req={req} /></div>
      <section>{output ? <ResultList output={output} req={req} /> : <div className="card p-5">
        <h2 className="font-semibold">How matches are assessed</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">Known failures of hard requirements are excluded. Soft preferences rank the remaining robots. Missing values remain open unless you enable strict mode.</p>
        <ul className="mt-5 space-y-3">{TRUSTS.map((trust) => <li key={trust} className="flex items-start gap-3 text-sm"><EvidenceBadge trust={trust} className="shrink-0" /><span className="text-muted">{TRUST_HINT[trust]}</span></li>)}</ul>
      </div>}</section>
    </div>
  </main>;
}