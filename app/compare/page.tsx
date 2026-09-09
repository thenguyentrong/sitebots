import type { Metadata } from 'next';
import Link from 'next/link';
import { CompareRadar } from '@/components/compare/CompareRadar';
import { CompareTable } from '@/components/compare/CompareTable';
import { COMPARE_MAX, getCompareRows } from '@/lib/queries/compare';
import { PRIVATE_METADATA } from '@/lib/seo';
import { ui } from '@/lib/ui';

export const dynamic = 'force-dynamic';

// Every combination of ids is a page; none of them should be indexed.
export const metadata: Metadata = { title: 'Compare robots', ...PRIVATE_METADATA };

type Search = Promise<{ ids?: string }>;

export default async function ComparePage({ searchParams }: { searchParams: Search }) {
  const { ids } = await searchParams;
  const requested = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const rows = await getCompareRows(requested);
  const dropped = requested.length - rows.length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 py-10">
        <div>
          <p className="eyebrow">Side by side</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Compare</h1>
          <p className="mt-3 max-w-2xl text-muted">
            Up to {COMPARE_MAX} robots, every value with its trust badge. The highlighted cell is the best published
            figure in its row; unpublished stays unpublished.
          </p>
          {requested.length > COMPARE_MAX ? (
            <p className="mt-3 text-sm font-medium text-safety">Only the first {COMPARE_MAX} of {requested.length} ids are shown.</p>
          ) : null}
          {dropped > 0 && requested.length <= COMPARE_MAX ? (
            <p className="mt-3 text-sm font-medium text-safety">
              {dropped} id{dropped === 1 ? '' : 's'} not found.
            </p>
          ) : null}
        </div>
        <Link href="/robots" className={ui.btnSecondary}>
          Add robots
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-subtle text-muted">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="7" height="16" rx="2" />
              <rect x="14" y="4" width="7" height="16" rx="2" />
            </svg>
          </span>
          <p className="text-muted">
            Nothing to compare yet. Pick robots with the Compare button on{' '}
            <Link href="/robots" className={ui.link}>
              the catalogue
            </Link>{' '}
            or on a robot page.
          </p>
        </div>
      ) : (
        <>
          <CompareRadar rows={rows} />
          <CompareTable rows={rows} />
        </>
      )}
    </main>
  );
}
