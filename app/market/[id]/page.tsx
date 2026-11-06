import { notFound, permanentRedirect } from 'next/navigation';
import { GermanySection, JobsSection, TrackRecordSection } from '@/components/market/GermanyBuy';
import { MarketSpecifications } from '@/components/market/MarketSpecifications';
import { ConfigurationEvidence } from '@/components/robot/ConfigurationEvidence';
import { RobotMedia } from '@/components/robot/RobotMedia';
import { RobotSection } from '@/components/robot/RobotSection';
import { RobotTemplate, STATUS_VARIANT } from '@/components/robot/RobotTemplate';
import { SourceList } from '@/components/robot/SourceList';
import { lifecycleLabel, marketFacts } from '@/lib/compare/facts';
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/market/cards';
import { cataloguePathFor } from '@/lib/market/links';
import { loadMarket } from '@/lib/market/load';
import { marketImage } from '@/lib/market/tiles';
import { publicMetadata } from '@/lib/seo';
import '@/components/market/market.css';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const robot = loadMarket().find((item) => item.id === id);
  return publicMetadata({ title: robot ? robot.name + ' in Germany' : 'Robot not found', description: robot ? robot.summary + ' ' + STATUS_LABELS[robot.germany.status] + '.' : '', path: `/market/${id}` });
}

/** The robot page for market records the catalogue does not carry, mostly job-specific construction machines. */
export default async function MarketRobotPage({ params }: { params: Params }) {
  const { id } = await params;
  const robot = loadMarket().find((item) => item.id === id);
  if (!robot) notFound();
  // One page per robot: where the catalogue has it, its page carries the German offer too.
  const linked = cataloguePathFor(robot.id);
  if (linked) permanentRedirect(linked + '#germany');
  const pictures = [robot.picture, ...robot.gallery].flatMap((picture) => picture ? [marketImage(picture)] : []);
  const form = robot.robotType === 'specialised' ? 'dedicated_robot' : robot.robotType;
  return <RobotTemplate page={{
    name: robot.name,
    type: TYPE_LABELS[robot.robotType],
    status: { label: lifecycleLabel(robot.lifecycle), variant: STATUS_VARIANT[robot.lifecycle] ?? 'neutral' },
    maker: { name: robot.maker, href: null, country: robot.makerCountry },
    configuration: robot.variant,
    summary: robot.summary,
    compare: { id: robot.id, name: robot.name },
    media: pictures.length ? <RobotMedia model={null} presets={{}} images={pictures} name={robot.name} formFactor={form} /> : null,
    germany: <GermanySection robots={[robot]} />,
    facts: marketFacts(robot),
    jobs: <JobsSection robots={[robot]} />,
    trackRecord: <TrackRecordSection robots={[robot]} />,
    specs: <MarketSpecifications robots={[robot]} />,
    specsAside: <span className="num text-xs text-faint">{robot.specs.length} value{robot.specs.length === 1 ? '' : 's'}</span>,
    moreLabel: 'Evidence profile',
    more: <RobotSection id="profile" title="Robot evidence profile" aside={<span className="text-xs text-muted">Checked <time dateTime={robot.checkedAt}>{robot.checkedAt}</time></span>}>
      <div className="px-5 py-5"><ConfigurationEvidence robots={[robot]} /></div>
    </RobotSection>,
    sources: <SourceList market={robot.sources} />,
  }} />;
}
