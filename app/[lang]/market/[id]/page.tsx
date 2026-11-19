import { notFound, permanentRedirect } from 'next/navigation';
import { GermanySection, JobsSection, TrackRecordSection } from '@/components/market/GermanyBuy';
import { MarketSpecifications } from '@/components/market/MarketSpecifications';
import { ConfigurationEvidence } from '@/components/robot/ConfigurationEvidence';
import { RobotMedia } from '@/components/robot/RobotMedia';
import { RobotSection } from '@/components/robot/RobotSection';
import { RobotTemplate, STATUS_VARIANT } from '@/components/robot/RobotTemplate';
import { ReviewsSection } from '@/components/robot/ReviewsSection';
import { VisitorReviews } from '@/components/reviews/VisitorReviews';
import { localePath } from '@/lib/i18n/config';
import { ROBOT_TEXT, recordDay } from '@/lib/i18n/robot';
import { pageLang } from '@/lib/i18n/server';
import { companySlugFor } from '@/lib/market/companies';
import { manufacturerLogo } from '@/lib/manufacturers';
import { SourceList } from '@/components/robot/SourceList';
import { lifecycleLabel, marketFacts } from '@/lib/compare/facts';
import { germanyStatusLabel, typeLabel } from '@/lib/market/cards';
import { cataloguePathFor } from '@/lib/market/links';
import { loadMarket } from '@/lib/market/load';
import { marketImage } from '@/lib/market/tiles';
import { publicMetadata } from '@/lib/seo';
import '@/components/market/market.css';

type Params = Promise<{ lang: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const lang = await pageLang(params);
  const t = ROBOT_TEXT[lang];
  const { id } = await params;
  const robot = loadMarket().find((item) => item.id === id);
  // The summary is the record's English text; the status after it is ours.
  return publicMetadata({ title: robot ? t.marketTitle(robot.name) : t.notFound, description: robot ? robot.summary + ' ' + germanyStatusLabel(robot.germany.status, lang) + '.' : '', path: `/market/${id}`, lang });
}

/** The robot page for market records the catalogue does not carry, mostly job-specific construction machines. */
export default async function MarketRobotPage({ params }: { params: Params }) {
  const lang = await pageLang(params);
  const t = ROBOT_TEXT[lang];
  const { id } = await params;
  const robot = loadMarket().find((item) => item.id === id);
  if (!robot) notFound();
  // One page per robot: where the catalogue has it, its page carries the German offer too.
  const linked = cataloguePathFor(robot.id);
  if (linked) permanentRedirect(localePath(linked, lang));
  const pictures = [robot.picture, ...robot.gallery].flatMap((picture) => picture ? [marketImage(picture)] : []);
  const form = robot.robotType === 'specialised' ? 'dedicated_robot' : robot.robotType;
  const company = companySlugFor(robot);
  return <RobotTemplate page={{
    lang,
    name: robot.name,
    type: typeLabel(robot.robotType, lang),
    status: { label: lifecycleLabel(robot.lifecycle, lang), variant: STATUS_VARIANT[robot.lifecycle] ?? 'neutral' },
    maker: { name: robot.maker, href: '/brands/' + company, country: robot.makerCountry, logo: manufacturerLogo(company) },
    configuration: robot.variant,
    summary: robot.summary,
    compare: { id: robot.id, name: robot.name },
    media: pictures.length ? <RobotMedia model={null} presets={{}} images={pictures} name={robot.name} formFactor={form} /> : null,
    germany: <GermanySection robots={[robot]} />,
    facts: marketFacts(robot, lang),
    jobs: <JobsSection robots={[robot]} />,
    trackRecord: <TrackRecordSection robots={[robot]} />,
    specs: <MarketSpecifications robots={[robot]} />,
    specsAside: <span className="num text-xs text-faint">{t.valueCount(robot.specs.length)}</span>,
    moreLabel: t.moreMarket,
    more: <RobotSection id="profile" title={t.evidenceProfile} aside={<span className="text-xs text-muted">{t.checked} <time dateTime={robot.checkedAt}>{recordDay(robot.checkedAt, lang)}</time></span>}>
      <div className="px-5 py-5"><ConfigurationEvidence robots={[robot]} lang={lang} /></div>
    </RobotSection>,
    reviews: <><ReviewsSection ids={[robot.id]} /><VisitorReviews target={'robot:' + robot.id} name={robot.name} /></>,
    sources: <SourceList market={robot.sources} lang={lang} />,
  }} />;
}
