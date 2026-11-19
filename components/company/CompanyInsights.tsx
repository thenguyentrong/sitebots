import Link from 'next/link';
import type { ReactNode } from 'react';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import { GermanFlag } from '@/components/market/Flag';
import { ReviewsSection } from '@/components/robot/ReviewsSection';
import { VisitorReviews } from '@/components/reviews/VisitorReviews';
import { RobotUseCard } from '@/components/use-cases/RobotUseCard';
import { UseMap } from '@/components/use-cases/UseMap';
import { CountryFlag, StageBar, StageWords, photoFit } from '@/components/use-cases/parts';
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/market/cards';
import { companyInsight } from '@/lib/market/companies';
import { cataloguePathFor, robotHref } from '@/lib/market/links';
import type { MarketRobot } from '@/lib/market/load';
import { groupByRobot, scenePicture, stageCounts, usePoints } from '@/lib/market/use-case-views';
import { countryName, loadUseCases } from '@/lib/market/use-cases';

function price(robot: MarketRobot): string {
  const eur = robot.germany.priceEur;
  if (eur) return (eur.kind === 'from' ? 'from ' : '') + '€' + eur.amount.toLocaleString('en-GB', { maximumFractionDigits: 0 }) + (eur.basis === 'net' ? ' net' : eur.basis === 'gross' ? ' incl. VAT' : '');
  const other = robot.germany.priceOther;
  return other ? other.currency + ' ' + other.amount.toLocaleString('en-GB', { maximumFractionDigits: 0 }) : 'Price on request';
}

/** One counted fact: a big number, its share as a bar, green when it speaks for the company, amber when against. */
function Score({ label, value, of, good, hint, children }: { label: string; value: number; of?: number; good: boolean; hint?: string; children?: ReactNode }) {
  const Icon = good ? CheckCircle : WarningCircle;
  return <div className="card flex flex-col gap-3 p-5">
    <p className="flex items-center gap-1.5 text-sm font-medium"><Icon size={17} weight="fill" className={good ? 'shrink-0 text-trust-verified' : 'shrink-0 text-trust-reported'} aria-hidden /><span>{label}</span><span className="sr-only">{good ? '(strength)' : '(weak point)'}</span></p>
    <p className="num leading-none"><span className="text-4xl font-semibold tracking-tight">{value}</span>{of != null ? <span className="text-lg text-faint"> / {of}</span> : null}</p>
    {of ? <span className="h-1.5 w-full overflow-hidden rounded-full bg-subtle" aria-hidden><span className={'block h-full rounded-full ' + (good ? 'bg-trust-verified' : 'bg-trust-reported')} style={{ width: `${Math.max(3, (value / of) * 100)}%` }} /></span> : null}
    {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    {children}
  </div>;
}

/** The analysis part of a company page: what it makes, a scorecard counted from the records, where its robots
 * work on a map and in photo cards, its robots, and what people say. */
export function CompanyInsights({ slug, name, description, robots, showAllRobots }: { slug: string; name: string; description: string | null; robots: MarketRobot[]; showAllRobots: boolean }) {
  const insight = companyInsight(robots);
  const f = insight.facts;
  const ids = new Set(robots.map((robot) => robot.id));
  const uses = loadUseCases().filter((use) => ids.has(use.robotId));
  const groups = groupByRobot(uses);
  const map = usePoints(uses);
  const extra = showAllRobots ? robots : robots.filter((robot) => !cataloguePathFor(robot.id));
  const r = insight.reviews;
  // Up to three photos of different robots, photos of work first.
  const photos = robots.flatMap((robot) => { const p = scenePicture(robot); return p ? [{ ...p, robot: robot.name, href: robotHref(robot.id) }] : []; })
    .filter((p, i, all) => all.findIndex((q) => q.src === p.src) === i).sort((a, b) => Number(b.scene) - Number(a.scene)).slice(0, 3);
  const showMap = map.points.length >= 3 || map.countries.length >= 2;

  return <div className="space-y-12">
    <section aria-labelledby="what-they-do" className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div>
        <h2 id="what-they-do" className="label">What the company does</h2>
        {robots.length ? <p className="mt-3 text-xl font-medium leading-snug tracking-tight sm:text-2xl">{insight.doesWhat}</p> : null}
        {description ? <p className="mt-3 text-sm text-muted">{description}</p> : null}
        {photos.length ? <div className={'mt-6 grid gap-3 ' + (photos.length === 3 ? 'grid-cols-[minmax(0,2fr)_minmax(0,1fr)] grid-rows-2' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
          {photos.map((photo, i) => <Link key={photo.src} href={photo.href} className={'group relative block overflow-hidden rounded-2xl bg-white ' + (photos.length === 3 ? (i === 0 ? 'row-span-2 aspect-[4/3]' : 'h-full') : photos.length === 2 ? 'aspect-[4/3]' : 'aspect-[16/10]')} aria-label={photo.robot}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt={photo.alt} loading={i ? 'lazy' : 'eager'} decoding="async" className={photoFit(photo) + ' h-full w-full transition duration-500 group-hover:scale-[1.03]'} />
            <span className="absolute bottom-2 left-2 max-w-[85%] truncate rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">{photo.robot}</span>
          </Link>)}
        </div> : null}
      </div>
      {robots.length ? <div className="grid grid-cols-2 gap-3 self-start">
        <Score label="Can be ordered in Germany" value={f.orderable} of={f.robots} good={f.orderable > 0} hint={f.cart ? `${f.cart} with a shop cart` : f.orderable ? 'on request from a seller' : 'no German or EU sales route found'}>
          {f.sellers.length ? <p className="flex flex-wrap gap-1.5">{f.sellers.slice(0, 4).map((seller) => <span key={seller} className="inline-flex items-center gap-1.5 rounded-full border border-edge px-2 py-0.5 text-[11px]"><GermanFlag className="h-2 w-3" title="" />{seller}</span>)}{f.sellers.length > 4 ? <span className="text-[11px] text-muted">+{f.sellers.length - 4}</span> : null}</p> : null}
        </Score>
        <Score label="Published price" value={f.priced} of={f.robots} good={f.priced > 0} hint={f.priced === f.robots ? 'for every robot' : f.priced ? `${f.robots - f.priced} on request` : 'every robot on request'} />
        <Score label="On general sale" value={f.onSale} of={f.robots} good={f.onSale > 0} hint={f.onSale === f.robots ? 'no prototypes' : `${f.robots - f.onSale} prototype, pilot or pre-order`} />
        <Score label="Documented uses" value={insight.uses.total} good={insight.uses.total > 0} hint={insight.uses.total ? `${insight.uses.daily} in daily use, ${insight.uses.countries.length} countr${insight.uses.countries.length === 1 ? 'y' : 'ies'}` : 'only the maker’s own claims so far'}>
          {insight.uses.countries.length ? <p className="flex flex-wrap gap-1">{insight.uses.countries.slice(0, 8).map((code) => <span key={code} title={countryName(code)}><CountryFlag code={code} /></span>)}</p> : null}
        </Score>
        {r.total ? <div className="card col-span-2 flex flex-col gap-3 p-5">
          <p className="flex items-center justify-between gap-2 text-sm font-medium"><span>Independent reviews and user reports</span><span className="num text-faint">{r.total}</span></p>
          <span className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden>
            {r.positive ? <span className="bg-trust-verified" style={{ flexGrow: r.positive }} /> : null}
            {r.mixed ? <span className="bg-edge-strong" style={{ flexGrow: r.mixed }} /> : null}
            {r.critical ? <span className="bg-trust-reported" style={{ flexGrow: r.critical }} /> : null}
            {r.total - r.positive - r.mixed - r.critical > 0 ? <span className="bg-subtle" style={{ flexGrow: r.total - r.positive - r.mixed - r.critical }} /> : null}
          </span>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-trust-verified" />{r.positive} positive</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-edge-strong" />{r.mixed} mixed</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-trust-reported" />{r.critical} critical</span>
            <a href="#reviews" className="ml-auto underline underline-offset-2 hover:text-foreground">Read them</a>
          </p>
        </div> : null}
      </div> : null}
    </section>

    {uses.length ? <section aria-labelledby="where-it-works" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="where-it-works" className="text-2xl font-semibold tracking-tight">Where their robots work</h2>
          <StageWords stages={stageCounts(uses)} className="mt-2" />
        </div>
        <Link href="/use-cases" className="text-sm text-muted underline underline-offset-4 hover:text-foreground">All use cases</Link>
      </div>
      {showMap ? <div className="card overflow-hidden"><UseMap points={map.points} active={new Set(map.countries.map((c) => c.code))} href={(code) => '/use-cases?country=' + code + '#explore'} /></div> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{groups.map((group) => <RobotUseCard key={group.robotId} group={group} />)}</div>
    </section> : null}

    {extra.length ? <section aria-labelledby="company-robots">
      <h2 id="company-robots" className="mb-4 text-2xl font-semibold tracking-tight">{showAllRobots ? 'Robots' : 'More robots and configurations'} <span className="num text-base font-normal text-faint">{extra.length}</span></h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {extra.map((robot) => {
          const picture = scenePicture(robot);
          const robotUses = uses.filter((use) => use.robotId === robot.id);
          return <Link key={robot.id} href={robotHref(robot.id)} className="card group flex flex-col overflow-hidden transition hover:border-edge-strong">
            <span className="relative block aspect-[4/3] overflow-hidden bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {picture ? <img src={picture.src} alt={picture.alt} loading="lazy" decoding="async" className={photoFit(picture) + ' h-full w-full transition duration-500 group-hover:scale-[1.03]'} /> : <span className="grid h-full place-items-center bg-subtle text-xs text-faint">No picture published</span>}
              {robot.germany.status === 'buy_now' || robot.germany.status === 'quote' ? <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[10px] font-medium shadow-sm"><GermanFlag className="h-2 w-3" title="" />{STATUS_LABELS[robot.germany.status]}</span> : null}
            </span>
            <span className="flex flex-1 flex-col gap-1 p-3.5 text-sm">
              <span className="font-medium leading-snug">{robot.name}</span>
              <span className="text-xs text-muted">{TYPE_LABELS[robot.robotType]}</span>
              <span className="num mt-auto pt-2 text-sm font-semibold">{price(robot)}</span>
              {robotUses.length ? <StageBar stages={stageCounts(robotUses)} className="mt-1 h-1.5" /> : null}
            </span>
          </Link>;
        })}
      </div>
    </section> : null}

    <div className="space-y-6">
      <ReviewsSection ids={robots.map((robot) => robot.id)} />
      <VisitorReviews target={'company:' + slug} name={name} />
    </div>
  </div>;
}
