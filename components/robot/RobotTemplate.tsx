import Link from '@/components/LocaleLink';
import type { ReactNode } from 'react';
import { CompareToggle } from '@/components/compare/CompareBar';
import { MakerAvatar } from '@/components/MakerAvatar';
import type { ManufacturerLogo } from '@/lib/manufacturers';
import { FactValues } from '@/components/compare/FactValues';
import { RobotSection } from '@/components/robot/RobotSection';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { KEY_FACT_ROWS, factLabel, type Facts } from '@/lib/compare/facts';
import { recordLang, type Lang } from '@/lib/i18n/config';
import { ROBOT_TEXT } from '@/lib/i18n/robot';
import { countryLabel } from '@/lib/market/places';
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
  /** The page's language: our words follow it, the record's summary stays English. */
  lang: Lang;
  name: string;
  type: string;
  status: { label: string; variant: NonNullable<BadgeProps['variant']> };
  year?: number | null;
  maker: { name: string; href: string | null; country: string | null; logo?: ManufacturerLogo | null };
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
  /** Public reviews; the section shows even when there are none. */
  reviews?: ReactNode;
  sources: ReactNode;
  /** ?render=1: the viewer alone, used to make the card pictures. */
  compact?: boolean;
};

function Header({ page }: { page: RobotPageContent }) {
  const { maker, lang } = page;
  const t = ROBOT_TEXT[lang];
  // Two-letter codes are shown as a country name; anything longer is already a name.
  const country = maker.country && /^[A-Z]{2}$/.test(maker.country) && lang !== 'en' ? countryLabel(maker.country, lang) : maker.country;
  const makerName = maker.href ? <Link href={maker.href} className="transition hover:text-foreground">{maker.name}</Link> : <span>{maker.name}</span>;
  return <div className="border-b border-edge/70 bg-card/60">
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-faint" aria-label={t.breadcrumb}>
        <Link href="/robots" className="transition hover:text-foreground">{t.robots}</Link>
        <span aria-hidden>/</span>
        {makerName}
        <span aria-hidden>/</span>
        <span className="text-foreground">{page.name}</span>
      </nav>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-3xl flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{page.type}</Badge>
            <Badge variant={page.status.variant}>{page.status.label}</Badge>
            {page.year ? <Badge variant="neutral">{page.year}</Badge> : null}
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{page.name}</h1>
          <p className="mt-2 text-sm text-muted">
            {t.by}{' '}
            {maker.href ? <Link href={maker.href} className="font-medium text-foreground underline-offset-4 hover:underline">{maker.name}</Link> : <span className="font-medium text-foreground">{maker.name}</span>}
            {country ? ` · ${country}` : ''}
            {page.configuration ? <> · {t.configuration} <span lang={recordLang(lang)}>{page.configuration}</span></> : null}
          </p>
          {page.summary ? <p className="mt-4 max-w-2xl text-base text-muted" lang={recordLang(lang)}>{plainDashes(page.summary)}</p> : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <CompareToggle id={page.compare.id} name={page.compare.name} size="md" />
            {page.actions}
          </div>
        </div>
        {maker.href ? <Link href={maker.href} className="group flex w-full shrink-0 items-center gap-3 rounded-2xl border border-edge/70 bg-card p-3 transition hover:border-edge-strong sm:w-56 sm:flex-col sm:items-stretch sm:p-4" aria-label={t.makerCard(maker.name)}>
          <MakerAvatar name={maker.name} logo={maker.logo} className="h-14 w-28 sm:h-20 sm:w-full" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{maker.name}</span>
            <span className="block text-xs text-muted underline-offset-4 group-hover:underline">{t.makerCardLink}</span>
          </span>
        </Link> : null}
      </header>
    </div>
  </div>;
}

/** The same rows on every robot page, so two pages can be read side by side. */
function KeyFacts({ facts, lang }: { facts: Facts; lang: Lang }) {
  const t = ROBOT_TEXT[lang];
  return <RobotSection id="key-facts" title={t.keyFacts} aside={<a href="#specs" className="text-xs text-muted underline underline-offset-2 hover:text-foreground">{t.allSpecs}</a>}>
    <dl className="grid grid-cols-1 gap-px bg-edge/60 sm:grid-cols-2">
      {KEY_FACT_ROWS.map((row) => <div key={row.key} data-fact={row.key} className="bg-card px-5 py-2.5 text-sm">
        <dt className="text-xs text-muted">{factLabel(row.key, lang)}</dt>
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
  const t = ROBOT_TEXT[page.lang];
  const links: [string, string][] = [
    ['jobs', t.nav.jobs],
    ['track-record', t.nav.trackRecord],
    ['specs', t.nav.specs],
    ...(page.conflicts ? [['conflicts', t.nav.conflicts] as [string, string]] : []),
    ...(page.reviews ? [['reviews', t.nav.reviews] as [string, string]] : []),
    ['more-detail', t.nav.more],
    ['sources', t.nav.sources],
  ];
  const media = page.media ?? <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-subtle text-sm text-muted" data-no-picture>{t.noPicture}</div>;
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
          <KeyFacts facts={page.facts} lang={page.lang} />
          {page.prices}
        </div>
      </div>

      <nav aria-label={t.nav.label} className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-edge/70 pt-4 text-sm">
        <span className="label">{t.nav.label}</span>
        {links.map(([id, label]) => <a key={id} href={'#' + id} className="text-muted underline-offset-4 transition hover:text-foreground hover:underline">{label}</a>)}
      </nav>

      <div className="mt-6 space-y-6">
        {page.jobs}
        {page.trackRecord}
        <RobotSection id="specs" title={t.nav.specs} aside={page.specsAside} empty={t.specsEmpty}>{page.specs}</RobotSection>
        {page.conflicts}
        <details id="more-detail" className="group scroll-mt-6">
          <summary className="card flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
            <h2 className="text-sm font-semibold">{t.nav.more}</h2>
            <span className="flex flex-wrap items-center gap-3 text-xs text-muted">{page.moreLabel}<span className="underline group-open:hidden">{t.show}</span><span className="hidden underline group-open:inline">{t.hide}</span></span>
          </summary>
          <div className="mt-6 space-y-6">{page.more}</div>
        </details>
        {page.reviews}
        {page.sources}
      </div>
    </main>
  </>;
}
