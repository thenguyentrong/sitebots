import type { Metadata } from 'next';
import Link from '@/components/LocaleLink';
import { Fragment } from 'react';
import { CompareSearch } from '@/components/compare/CompareControls';
import { CompareTable } from '@/components/compare/CompareTable';
import { SavedComparison } from '@/components/compare/SavedComparison';
import { COMPARE_TEXT } from '@/lib/i18n/compare';
import { formatNumber } from '@/lib/i18n/format';
import { pageLang } from '@/lib/i18n/server';
import { COMPARE_MAX, getCompareColumns } from '@/lib/queries/compare';
import { PRIVATE_METADATA } from '@/lib/seo';
import { ui } from '@/lib/ui';

export const dynamic = 'force-dynamic';

type Params = Promise<{ lang: string }>;

// Every combination of ids is a page; none of them should be indexed.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lang = await pageLang(params);
  return { title: COMPARE_TEXT[lang].title, ...PRIVATE_METADATA };
}

type Search = Promise<{ ids?: string }>;

export default async function ComparePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const lang = await pageLang(params);
  const t = COMPARE_TEXT[lang];
  const num = (n: number) => formatNumber(n, lang);
  const { ids } = await searchParams;
  const requested = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const { columns, robots, unknown } = await getCompareColumns(requested, lang);
  const EmptyState = ids === undefined ? SavedComparison : Fragment;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6">
      <header className="py-10">
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t.heading}</h1>
        <p className="mt-3 max-w-2xl text-muted">{t.lead(num(COMPARE_MAX))}</p>
        {robots > COMPARE_MAX ? <p className="mt-3 text-sm font-medium text-safety">{t.limited(num(COMPARE_MAX), num(robots))}</p> : null}
        {unknown > 0 ? <p className="mt-3 text-sm font-medium text-safety">{t.unknown(unknown, num(unknown))}</p> : null}
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <CompareSearch selected={columns.map(({ id, name }) => ({ id, name }))} max={COMPARE_MAX} />
          <Link href="/robots" className={ui.btnSecondary}>{t.browse}</Link>
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
            {t.emptyBefore}
            <Link href="/robots" className={ui.link}>
              {t.emptyLink}
            </Link>
            {t.emptyAfter}
          </p>
        </div></EmptyState>
      ) : <CompareTable columns={columns} lang={lang} />}
    </main>
  );
}
