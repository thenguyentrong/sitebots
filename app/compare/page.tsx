import type { Metadata } from 'next';
import Link from 'next/link';
import { Fragment } from 'react';
import { CompareSearch } from '@/components/compare/CompareControls';
import { CompareTable } from '@/components/compare/CompareTable';
import { SavedComparison } from '@/components/compare/SavedComparison';
import { COMPARE_MAX, getCompareColumns } from '@/lib/queries/compare';
import { PRIVATE_METADATA } from '@/lib/seo';
import { ui } from '@/lib/ui';

export const dynamic = 'force-dynamic';

// Every combination of ids is a page; none of them should be indexed.
export const metadata: Metadata = { title: 'Compare robots', ...PRIVATE_METADATA };

type Search = Promise<{ ids?: string }>;

export default async function ComparePage({ searchParams }: { searchParams: Search }) {
  const { ids } = await searchParams;
  const requested = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const { columns, robots, unknown } = await getCompareColumns(requested);
  const EmptyState = ids === undefined ? SavedComparison : Fragment;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6">
      <header className="py-10">
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Compare</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Up to {COMPARE_MAX} robots side by side, any type. Each row shows what was published, with its conditions and
          source. We do not score or rank them: what fits your job is your call. If a value is missing, it says Not published.
        </p>
        {robots > COMPARE_MAX ? <p className="mt-3 text-sm font-medium text-safety">Only the first {COMPARE_MAX} of {robots} robots are shown.</p> : null}
        {unknown > 0 ? <p className="mt-3 text-sm font-medium text-safety">{unknown} robot{unknown === 1 ? '' : 's'} not found.</p> : null}
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <CompareSearch selected={columns.map(({ id, name }) => ({ id, name }))} max={COMPARE_MAX} />
          <Link href="/robots" className={ui.btnSecondary}>Browse robots</Link>
        </div>
      </header>

      {columns.length === 0 ? (
        <EmptyState><div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-subtle text-muted">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="7" height="16" rx="2" />
              <rect x="14" y="4" width="7" height="16" rx="2" />
            </svg>
          </span>
          <p className="text-muted">
            Nothing to compare yet. Search for a robot above, or use the Compare button on{' '}
            <Link href="/robots" className={ui.link}>
              the robots page
            </Link>{' '}
            or on any robot page.
          </p>
        </div></EmptyState>
      ) : <CompareTable columns={columns} />}
    </main>
  );
}
