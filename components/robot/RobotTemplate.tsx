import Link from 'next/link';
import type { ReactNode } from 'react';
import { CompareToggle } from '@/components/compare/CompareBar';
import { FactValues } from '@/components/compare/FactValues';
import { RobotSection } from '@/components/robot/RobotSection';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { KEY_FACT_ROWS, type Facts } from '@/lib/compare/facts';
import { plainDashes } from '@/lib/spec/display';

export const STATUS_VARIANT: Record<string, NonNullable<BadgeProps['variant']>> = {
  shipping: 'success',
  pre_order: 'info',
  preorder: 'info',
  pilot_only: 'neutral',
  prototype: 'neutral',
  concept: 'neutral',
  discontinued: 'warn',
  unknown: 'neutral',
};

export type RobotPageContent = {
  name: string;
  type: string;
  status: { label: string; variant: NonNullable<BadgeProps['variant']> };
  year?: number | null;
  maker: { name: string; href: string | null; country: string | null };
  configuration?: string | null;
  summary: string | null;
  compare: { id: string; name: string };
  /** Beside the Compare button: the variant tabs of a catalogue page. */
  actions?: ReactNode;
  notice?: ReactNode;
  /** Pictures or 3D model. Null shows the empty picture box. */
  media: ReactNode;
  germany: ReactNode;
  /** The catalogue's prices by region, under the German offer. */
  prices?: ReactNode;
  facts: Facts;
  jobs: ReactNode;
  trackRecord: ReactNode;
  specs: ReactNode;
  specsAside?: ReactNode;
  conflicts?: ReactNode;
  more: ReactNode;
  moreLabel: string;
  sources: ReactNode;
  /** ?render=1: the viewer alone, used to make the card pictures. */
  compact?: boolean;
};

function Header({ page }: { page: RobotPageContent }) {
  const { maker } = page;
  const makerName = maker.href ? <Link href={maker.href} className="transition hover:text-foreground">{maker.name}</Link> : <span>{maker.name}</span>;
  return <div className="border-b border-edge/70 bg-card/60">
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-faint" aria-label="Breadcrumb">
        <Link href="/robots" className="transition hover:text-foreground">Robots</Link>
        <span aria-hidden>/</span>
        {makerName}
        <span aria-hidden>/</span>
        <span className="text-foreground">{page.name}</span>
      </nav>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{page.type}</Badge>
            <Badge variant={page.status.variant}>{page.status.label}</Badge>
            {page.year ? <Badge variant="neutral">{page.year}</Badge> : null}
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{page.name}</h1>
          <p className="mt-2 text-sm text-muted">
            by{' '}
            {maker.href ? <Link href={maker.href} className="font-medium text-foreground underline-offset-4 hover:underline">{maker.name}</Link> : <span className="font-medium text-foreground">{maker.name}</span>}
            {maker.country ? ` · ${maker.country}` : ''}
            {page.configuration ? ` · Configuration: ${page.configuration}` : ''}
          </p>
          {page.summary ? <p className="mt-4 max-w-2xl text-base text-muted">{plainDashes(page.summary)}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {page.actions}
          <CompareToggle id={page.compare.id} name={page.compare.name} size="md" />
        </div>
      </header>
    </div>
  </div>;
}

/** The same rows on every robot page, so two pages can be read side by side. */
function KeyFacts({ facts }: { facts: Facts }) {
  return <RobotSection id="key-facts" title="Key facts" aside={<a href="#specs" className="text-xs text-muted underline underline-offset-2 hover:text-foreground">All specifications</a>}>
    <dl className="grid grid-cols-1 gap-px bg-edge/60 sm:grid-cols-2">
      {KEY_FACT_ROWS.map((row) => <div key={row.key} data-fact={row.key} className="bg-card px-5 py-2.5 text-sm">
        <dt className="text-xs text-muted">{row.label}</dt>
        <dd className="mt-0.5"><FactValues values={facts[row.key]} /></dd>
      </div>)}
    </dl>
  </RobotSection>;
}

/**
 * The one robot page. Both routes hand it the same content, so the sections, their order and their
 * headings cannot drift apart: header; pictures, Buy in Germany and Key facts; On this page; Jobs;
 * Where it has worked; Specifications; Sources disagree where they do; More detail; Sources.
 */
export function RobotTemplate({ page }: { page: RobotPageContent }) {
  const links: [string, string][] = [
    ['jobs', 'Jobs'],
    ['track-record', 'Where it has worked'],
    ['specs', 'Specifications'],
    ...(page.conflicts ? [['conflicts', 'Sources disagree'] as [string, string]] : []),
    ['more-detail', 'More detail'],
    ['sources', 'Sources'],
  ];
  const media = page.media ?? <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-subtle text-sm text-muted" data-no-picture>No picture published</div>;
  // The render script photographs the canvas, so the grid stays to keep the column width it renders at.
  if (page.compact) return <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"><div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"><div>{media}</div></div></main>;
  return <>
    <Header page={page} />
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {page.notice}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">{media}</div>
        <div className="min-w-0 space-y-6">
          {page.germany}
          <KeyFacts facts={page.facts} />
          {page.prices}
        </div>
      </div>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-edge/70 pt-4 text-sm">
        <span className="label">On this page</span>
        {links.map(([id, label]) => <a key={id} href={'#' + id} className="text-muted underline-offset-4 transition hover:text-foreground hover:underline">{label}</a>)}
      </nav>

      <div className="mt-6 space-y-6">
        {page.jobs}
        {page.trackRecord}
        <RobotSection id="specs" title="Specifications" aside={page.specsAside} empty="No specifications recorded yet.">{page.specs}</RobotSection>
        {page.conflicts}
        <details id="more-detail" className="group scroll-mt-6">
          <summary className="card flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
            <h2 className="text-sm font-semibold">More detail</h2>
            <span className="flex flex-wrap items-center gap-3 text-xs text-muted">{page.moreLabel}<span className="underline group-open:hidden">Show</span><span className="hidden underline group-open:inline">Hide</span></span>
          </summary>
          <div className="mt-6 space-y-6">{page.more}</div>
        </details>
        {page.sources}
      </div>
    </main>
  </>;
}
