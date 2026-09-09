import Link from 'next/link';
import { RequirementForm } from '@/components/match/RequirementForm';
import { ResultList } from '@/components/match/ResultList';
import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import { RobotCard } from '@/components/robot/RobotCard';
import { Badge } from '@/components/ui/badge';
import { loadCandidates } from '@/lib/match/candidates';
import { hasAnyRequirement, requirementsFromParams } from '@/lib/match/requirements';
import { rankRobots } from '@/lib/match/score';
import { listRobotCards } from '@/lib/queries/robots';
import { getSiteStats } from '@/lib/queries/stats';
import { HOME_DESCRIPTION, publicMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { TRUST_HINT } from '@/lib/spec/display';
import type { Trust } from '@/lib/spec/enums';
import { ui } from '@/lib/ui';

export const dynamic = 'force-dynamic';

export const metadata = publicMetadata({
  title: SITE.tagline,
  description: HOME_DESCRIPTION,
  path: '/',
  absoluteTitle: true,
});

type Search = Promise<Record<string, string | string[] | undefined>>;

const fmt = (n: number) => n.toLocaleString('en-GB');

const STEPS = [
  {
    title: 'Describe the job and the site',
    text: 'Payload, reach, terrain, stairs, weather, shift length, budget, region and the date you need it by. Only what you know.',
  },
  {
    title: 'Hard requirements exclude',
    text: 'Payload, reach, tasks, stairs, slope, outdoor use, temperature, autonomy, certifications, rubble or mud. A robot that fails one is listed below the results with the reason.',
  },
  {
    title: 'Soft requirements rank',
    text: 'Runtime per shift, budget, delivery, gravel, dust, damp and noise, weighted and averaged over the criteria whose value is known. Unknown never counts against a robot unless you say so.',
  },
];

const TRUSTS: Trust[] = ['verified', 'assessed', 'reported', 'unknown'];

export default async function Home({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const { req, issues, asked } = requirementsFromParams(sp);
  const active = asked && hasAnyRequirement(req);

  let output = null;
  if (active) {
    const { candidates, usdToEur } = await loadCandidates();
    output = rankRobots(candidates, req, { usdToEur, limit: 30 });
  }
  const [stats, featured] = active ? [null, null] : await Promise.all([getSiteStats(), listRobotCards({ limit: 3 })]);

  return (
    <main className="w-full">
      {!active && stats ? (
        <section className="relative overflow-hidden border-b border-edge/70">
          <div className="bg-dots absolute inset-0 -z-10" aria-hidden />
          <div className="glow absolute inset-x-0 top-0 -z-10 h-[520px]" aria-hidden />
          <div className="mx-auto max-w-6xl px-4 pt-16 pb-14 sm:px-6 sm:pt-24 sm:pb-16">
            <Badge variant="outline" className="gap-2 bg-card/80 px-3 py-1 text-xs shadow-sm backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-trust-verified" aria-hidden />
              {fmt(stats.robots)} robots from {fmt(stats.makers)} makers, every value sourced
            </Badge>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Which robot can work on <span className="text-safety">your</span> construction site?
            </h1>
            <p className="mt-6 max-w-2xl text-base text-muted sm:text-lg">
              Say what the job and the site demand. Every robot that passes is ranked, every one that fails says why, and
              every value links to where it was read. What a maker has not published is shown as unverified, not guessed.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#matcher" className={`${ui.btn} h-11 px-6`}>
                Find a robot
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
              <Link href="/robots" className={`${ui.btnSecondary} h-11 px-6`}>
                Browse all robots
              </Link>
            </div>

            <dl className="card mt-14 grid grid-cols-2 divide-y divide-edge/70 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              {[
                { label: 'Robots tracked', value: fmt(stats.robots) },
                { label: 'Makers', value: fmt(stats.makers) },
                { label: 'Values verified by the maker', value: fmt(stats.verified) },
                { label: 'Prices with a source', value: fmt(stats.prices) },
              ].map((s) => (
                <div key={s.label} className="px-5 py-4">
                  <dt className="label">{s.label}</dt>
                  <dd className="num mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      <section id="matcher" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6 sm:py-14">
        {active ? (
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Results</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Robots for your site</h1>
              <p className="mt-2 text-muted">Ranked by how well the known values meet what you asked for. Change anything on the left and run it again.</p>
            </div>
            <Link href="/" className={ui.btnSecondary}>
              Start over
            </Link>
          </header>
        ) : (
          <header className="mb-8 max-w-2xl">
            <p className="eyebrow">The matcher</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Tell us about the job</h2>
            <p className="mt-2 text-muted">Fill in what you know. The result is a link you can send to a colleague.</p>
          </header>
        )}

        {issues.length ? (
          <p className="mb-6 rounded-xl border border-safety/30 bg-safety-soft/60 px-4 py-2.5 text-sm text-foreground">
            Ignored: {issues.join('; ')}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Sticky so the form stays beside long result lists, but scrollable
              inside the viewport: a sticky element taller than the screen would
              keep its lower half — and the submit button — out of reach. */}
          <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:rounded-2xl">
            <RequirementForm req={req} />
          </div>
          <section>
            {active && output ? (
              <ResultList output={output} req={req} />
            ) : (
              <div className="space-y-4">
                {STEPS.map((s, i) => (
                  <div key={s.title} className="card flex gap-4 p-5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">{i + 1}</span>
                    <div>
                      <h3 className="font-semibold">{s.title}</h3>
                      <p className="mt-1 text-sm text-muted">{s.text}</p>
                    </div>
                  </div>
                ))}
                <div className="card p-5">
                  <h3 className="font-semibold">How to read a value</h3>
                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {TRUSTS.map((t) => (
                      <li key={t} className="flex items-start gap-2.5 text-sm">
                        <EvidenceBadge trust={t} className="mt-0.5 shrink-0" />
                        <span className="text-muted">{TRUST_HINT[t]}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm text-muted">
                    Prices are shown in euro with their basis: listed by an EU distributor, converted from a US list price before
                    duties and VAT, or a reported estimate.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>

      {!active && featured ? (
        <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Best documented</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Robots with the most verified values</h2>
            </div>
            <Link href="/robots" className={ui.btnSecondary}>
              All {fmt(featured.total)} robots
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.robots.map((r) => (
              <RobotCard key={r.id} robot={r} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
