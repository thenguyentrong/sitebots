import Link from 'next/link';
import { CompareToggle } from '@/components/compare/CompareBar';
import { RobotCard } from '@/components/robot/RobotCard';
import { listRobotCards } from '@/lib/queries/robots';
import { publicMetadata } from '@/lib/seo';
import { FORM_FACTOR_LABEL } from '@/lib/spec/display';
import { FORM_FACTORS, type FormFactor } from '@/lib/spec/enums';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = publicMetadata({
  title: 'All robots',
  description: 'Every humanoid, quadruped and mobile manipulator in the database with sourced specifications, prices by region and delivery status.',
  path: '/robots',
});

const PAGE_SIZE = 48;

type Search = Promise<{ form?: string; q?: string; all?: string; pictures?: string }>;

export default async function RobotsPage({ searchParams }: { searchParams: Search }) {
  const { form, q, all, pictures } = await searchParams;
  // Robots with no real picture stay off the page unless asked for: a card without a picture is a card nobody can recognise.
  const showAllPictures = pictures === 'all';
  const formFactor = FORM_FACTORS.includes(form as FormFactor) ? (form as FormFactor) : undefined;
  const { robots, total, hidden } = await listRobotCards({ formFactor, q, limit: all === '1' ? 5000 : PAGE_SIZE, pictures: showAllPictures ? 'all' : 'with' });

  const hrefWith = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { form: formFactor, q, pictures: showAllPictures ? 'all' : undefined, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `/robots?${s}` : '/robots';
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 py-10">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Robots</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Every number links to the page it was read from. To filter by what a site needs, use the{' '}
            <Link href="/" className={ui.link}>
              matcher
            </Link>
            .
          </p>
        </div>
        <p className="num text-sm text-muted">
          {total.toLocaleString('en-GB')} robot{total === 1 ? '' : 's'}
        </p>
      </header>

      <div className="card mb-6 flex flex-wrap items-center gap-3 p-2">
        <nav className={ui.segment} aria-label="Form factor">
          <Link href={hrefWith({ form: undefined })} className={cn(ui.segmentItem, !formFactor && ui.segmentActive)} aria-current={!formFactor ? 'page' : undefined}>
            All
          </Link>
          {FORM_FACTORS.map((f) => (
            <Link key={f} href={hrefWith({ form: f })} className={cn(ui.segmentItem, formFactor === f && ui.segmentActive)} aria-current={formFactor === f ? 'page' : undefined}>
              {FORM_FACTOR_LABEL[f]}
            </Link>
          ))}
        </nav>
        <form action="/robots" method="get" className="ml-auto flex items-center gap-2">
          {formFactor ? <input type="hidden" name="form" value={formFactor} /> : null}
          <label className="relative block">
            <span className="sr-only">Search robots</span>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input type="search" name="q" defaultValue={q ?? ''} placeholder="Maker or model" className={`${ui.input} h-9 w-44 pl-9 sm:w-60`} />
          </label>
          <button type="submit" className={`${ui.btn} h-9 px-4`}>
            Search
          </button>
        </form>
      </div>

      <p className="label mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          {robots.length < total ? `${robots.length} of ${total} robots, best documented first` : `${total} robot${total === 1 ? '' : 's'}`}
          {q ? ` · matching “${q}”` : ''}
        </span>
        {showAllPictures ? (
          <Link href={hrefWith({ pictures: undefined })} className="normal-case tracking-normal text-faint underline-offset-2 hover:text-foreground hover:underline">
            Hide robots without a picture
          </Link>
        ) : hidden > 0 ? (
          <Link href={hrefWith({ pictures: 'all' })} className="normal-case tracking-normal text-faint underline-offset-2 hover:text-foreground hover:underline">
            Show {hidden.toLocaleString('en-GB')} more without a picture
          </Link>
        ) : null}
      </p>

      {robots.length === 0 ? (
        <div className="card px-6 py-16 text-center text-muted">Nothing matches.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {robots.map((r) => (
            <RobotCard key={r.id} robot={r} action={<CompareToggle id={r.id} name={r.name} />} />
          ))}
        </div>
      )}

      {robots.length < total ? (
        <div className="mt-10 text-center">
          <Link href={hrefWith({ all: '1' })} className={ui.btnSecondary}>
            Show all {total}
          </Link>
        </div>
      ) : null}
    </main>
  );
}
