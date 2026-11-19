import Link from 'next/link';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react/dist/ssr';
import { ReviewsSection } from '@/components/robot/ReviewsSection';
import { RobotSection } from '@/components/robot/RobotSection';
import { VisitorReviews } from '@/components/reviews/VisitorReviews';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/market/cards';
import { companyInsight } from '@/lib/market/companies';
import { cataloguePathFor, robotHref } from '@/lib/market/links';
import type { MarketRobot } from '@/lib/market/load';
import { countryName } from '@/lib/market/use-cases';

function price(robot: MarketRobot): string {
  const eur = robot.germany.priceEur;
  if (eur) return (eur.kind === 'from' ? 'from ' : '') + '€' + eur.amount.toLocaleString('en-GB', { maximumFractionDigits: 0 }) + (eur.basis === 'net' ? ' net' : eur.basis === 'gross' ? ' incl. VAT' : '');
  const other = robot.germany.priceOther;
  return other ? other.currency + ' ' + other.amount.toLocaleString('en-GB', { maximumFractionDigits: 0 }) : 'Price on request';
}

/** The analysis part of a company page: what it makes, strengths and weak points counted from the records,
 * where its robots work, its robots that have no catalogue page, and what people say. */
export function CompanyInsights({ slug, name, description, robots, showAllRobots }: { slug: string; name: string; description: string | null; robots: MarketRobot[]; showAllRobots: boolean }) {
  const insight = companyInsight(robots);
  const extra = showAllRobots ? robots : robots.filter((robot) => !cataloguePathFor(robot.id));
  return <div className="space-y-6">
    <RobotSection id="what-they-do" title="What the company does">
      <div className="space-y-2 px-5 py-4 text-sm">
        {description ? <p>{description}</p> : null}
        {robots.length ? <p className={description ? 'text-muted' : undefined}>{insight.doesWhat}</p> : null}
      </div>
    </RobotSection>

    {robots.length ? <section aria-label="Strengths and weak points" className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <RobotSection id="strengths" title="Strengths" aside={<span className="text-xs text-faint">counted from our records</span>} empty="Nothing we can count yet.">
        {insight.strengths.length ? <ul className="space-y-2.5 px-5 py-4 text-sm">{insight.strengths.map((line) => <li key={line} className="flex gap-2"><CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-trust-verified" aria-hidden /><span>{line}</span></li>)}</ul> : null}
      </RobotSection>
      <RobotSection id="weak-points" title="Weak points" aside={<span className="text-xs text-faint">counted from our records</span>} empty="No weak point in our records.">
        {insight.weaknesses.length ? <ul className="space-y-2.5 px-5 py-4 text-sm">{insight.weaknesses.map((line) => <li key={line} className="flex gap-2"><WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-trust-reported" aria-hidden /><span>{line}</span></li>)}</ul> : null}
      </RobotSection>
    </section> : null}

    {robots.length ? <RobotSection id="where-it-works" title="Where their robots work" aside={<Link href="/use-cases" className="text-xs text-muted underline underline-offset-2 hover:text-foreground">All use cases</Link>} empty="No documented project or demonstration yet.">
      {insight.uses.total ? <div className="space-y-3 px-5 py-4 text-sm">
        <p><span className="num font-semibold">{insight.uses.total}</span> documented use{insight.uses.total === 1 ? '' : 's'}, <span className="num font-semibold">{insight.uses.daily}</span> in daily use.</p>
        <div className="flex flex-wrap gap-2">{insight.uses.regions.map((region) => <Badge key={region.label} variant="outline">{region.label} <span className="num ml-1">{region.count}</span></Badge>)}</div>
        {insight.uses.countries.length ? <p className="text-xs text-muted">Countries: {insight.uses.countries.map(countryName).join(', ')}</p> : null}
      </div> : null}
    </RobotSection> : null}

    {extra.length ? <RobotSection id="company-robots" title={showAllRobots ? 'Robots' : 'More robots and configurations'} aside={<span className="num text-xs text-faint">{extra.length}</span>}>
      <ul className="grid grid-cols-1 gap-px bg-edge/60 sm:grid-cols-2 lg:grid-cols-3">
        {extra.map((robot) => <li key={robot.id} className="bg-card">
          <Link href={robotHref(robot.id)} className="flex h-full gap-3 p-4 transition hover:bg-subtle/60">
            <span className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {robot.picture ? <img src={robot.picture.src} alt={robot.picture.alt} loading="lazy" className="h-full w-full object-contain" /> : <span className="text-[10px] text-faint">No picture</span>}
            </span>
            <span className="min-w-0 text-sm">
              <span className="block font-medium leading-snug">{robot.name}</span>
              <span className="mt-0.5 block text-xs text-muted">{TYPE_LABELS[robot.robotType]} · {STATUS_LABELS[robot.germany.status]}</span>
              <span className="mt-0.5 block text-xs text-faint">{price(robot)}</span>
            </span>
          </Link>
        </li>)}
      </ul>
    </RobotSection> : null}

    <ReviewsSection ids={robots.map((robot) => robot.id)} />
    <VisitorReviews target={'company:' + slug} name={name} />
  </div>;
}
