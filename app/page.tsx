import Link from 'next/link';
import { JourneyStart } from '@/components/journey/JourneyStart';
import { RequirementForm } from '@/components/match/RequirementForm';
import { ResultList } from '@/components/match/ResultList';
import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import { loadContent } from '@/lib/content/load';
import { SETTING_GROUPS } from '@/lib/content/vocab';
import { loadCandidates } from '@/lib/match/candidates';
import { hasAnyRequirement, requirementsFromParams } from '@/lib/match/requirements';
import { rankRobots } from '@/lib/match/score';
import { HOME_DESCRIPTION, publicMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { pickExamples, settingOptions, taskCards } from '@/lib/tasks/cards';
import { TRUST_HINT } from '@/lib/spec/display';
import type { Trust } from '@/lib/spec/enums';
import { ui } from '@/lib/ui';
import './plan/plan.css';
import './plan/journey.css';

export const dynamic = 'force-dynamic';
export const metadata = publicMetadata({ title: SITE.tagline, description: HOME_DESCRIPTION, path: '/', absoluteTitle: true });
type Search = Promise<Record<string, string | string[] | undefined>>;
const TRUSTS: Trust[] = ['verified', 'assessed', 'reported', 'unknown'];

export default async function Home({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const { req, issues, asked } = requirementsFromParams(sp);
  const active = asked && hasAnyRequirement(req);
  // Existing specification-search URLs remain usable; the main entry is the journey.
  if (!active && sp.details !== '1') {
    const content = loadContent();
    const limits = content.humanoidLimits.map((limit) => ({ id: limit.id, label: limit.label.en, figure: limit.figure ?? limit.value, value: limit.value, basis: limit.basis }));
    const settings = settingOptions(content);
    const cards = taskCards(content);
    const groups = SETTING_GROUPS.map((group) => {
      const ids = settings.filter((s) => s.group === group).map((s) => s.id);
      const tasks = cards.filter((c) => ids.includes(c.setting));
      const verdicts = { candidate: 0, marginal: 0, ruled_out: 0, unscreened: 0 };
      for (const c of tasks) verdicts[c.reference_verdict] += 1;
      return { group, count: tasks.length, settings: new Set(tasks.map((c) => c.setting)).size, verdicts, examples: pickExamples(tasks, group === 'site' ? 5 : 1).map((c) => ({ title: c.title.en, href: '/use-cases/' + c.setting + '/' + c.slug, verdict: c.reference_verdict })) };
    });
    return <main className="jp-page plan-page">
      <noscript><p>The plan keeps your work in this browser and needs JavaScript. <Link className="underline" href="/use-cases">Browse the use cases</Link> or <Link className="underline" href="/?details=1#matcher">search by specifications</Link>.</p></noscript>
      <JourneyStart limits={limits} groups={groups} />
    </main>;
  }

  const data = active ? await loadCandidates() : null;
  const output = data ? rankRobots(data.candidates, req, { usdToEur: data.usdToEur, limit: 30 }) : null;
  return <main id="matcher" className="mx-auto w-full max-w-6xl scroll-mt-32 px-4 py-10 sm:scroll-mt-20 sm:px-6">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Specification search</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{active ? 'Robots for your requirements' : 'Refine your requirements'}</h1><p className="mt-2 max-w-2xl text-sm text-muted">Fill in what you know. Review recorded matches and open questions. Your search is saved in this link.</p></div>
      <Link href="/" className={ui.btnSecondary}>Start from your work →</Link>
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
