import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { BuyBox, RobotEvidence, RobotJobs } from '@/components/market/GermanyBuy';
import { MarketSpecifications } from '@/components/market/MarketSpecifications';
import { ConfigurationEvidence } from '@/components/robot/ConfigurationEvidence';
import { RobotGlyph } from '@/components/robot/RobotGlyph';
import { RobotMedia } from '@/components/robot/RobotMedia';
import { marketImage } from '@/lib/market/tiles';
import { STATUS_LABELS, TYPE_LABELS, bodyLabel } from '@/lib/market/cards';
import { cataloguePathFor } from '@/lib/market/links';
import { loadMarket } from '@/lib/market/load';
import { publicMetadata } from '@/lib/seo';
import '@/components/market/market.css';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const robot = loadMarket().find((item) => item.id === id);
  return publicMetadata({ title: robot ? robot.name + ' in Germany' : 'Robot not found', description: robot ? robot.summary + ' ' + STATUS_LABELS[robot.germany.status] + '.' : '', path: `/market/${id}` });
}

const yesNo = (value: boolean | null) => value === null ? 'Unknown' : value ? 'Yes' : 'No';
const HANDS: Record<string, string> = { none: 'No hands', gripper: 'Grippers', dexterous: 'Multi-finger hands', tool: 'Process tool', optional: 'Hands sold separately' };

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
  const c = robot.capabilities;
  const facts: [string, string][] = [
    ['Moves on', bodyLabel(robot).replace(/^On /, '')],
    ['Stairs', yesNo(c.stairs)],
    ['Rough ground', yesNo(c.roughGround)],
    ['Outdoors', yesNo(c.outdoor)],
    ['Arms', c.arms ? String(c.arms) : 'None'],
    ['Hands', HANDS[c.hands] + (c.hands !== 'none' && c.handsIncluded === false ? ', not included' : '')],
    ['Payload per arm', c.armPayloadKg === null ? 'Unknown' : c.armPayloadKg + ' kg'],
    ['Carries on body', c.carryPayloadKg === null ? 'Unknown' : c.carryPayloadKg + ' kg'],
    ['Runtime', c.runtimeH === null ? 'Unknown' : c.runtimeH + ' h'],
    ['Protection', c.ipRating ?? 'Unknown'],
  ];
  return <main className="mk-page mk-detail">
    <p className="mk-crumbs"><Link href="/robots">Robots</Link> / {robot.name}</p>
    <section className="mk-detail-top">
      <div className="mk-detail-pic">
        {pictures.length ? <RobotMedia model={null} presets={{}} images={pictures} name={robot.name} formFactor={form} /> : <RobotGlyph formFactor={form} className="mk-glyph" />}
      </div>
      <div className="mk-detail-info" id="germany">
        <p className="mk-maker">{TYPE_LABELS[robot.robotType]} · {bodyLabel(robot)} · {robot.maker}, {robot.makerCountry}</p>
        <h1>{robot.name}</h1>
        {robot.variant ? <p className="mk-variant">Configuration: {robot.variant}</p> : null}
        <p className="mk-detail-summary">{robot.summary}</p>
        <BuyBox robot={robot} />
      </div>
    </section>

    <section className="mk-detail-section" aria-labelledby="can-do">
      <h2 id="can-do">What it can do</h2>
      <dl className="mk-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {c.notes.length ? <ul className="mk-notes">{c.notes.map((note) => <li key={note}>{note}</li>)}</ul> : null}
    </section>

    <section className="mk-detail-section" aria-labelledby="jobs">
      <h2 id="jobs">Jobs on the map</h2>
      <RobotJobs robotId={robot.id} />
    </section>

    {robot.evidence.length ? <section className="mk-detail-section" aria-labelledby="evidence">
      <h2 id="evidence">Where it has worked</h2>
      <RobotEvidence robots={[robot]} />
    </section> : null}

    <div id="specs" className="scroll-mt-6">
      <MarketSpecifications robots={[robot]} />
    </div>

    <section id="profile" className="card mt-6 scroll-mt-6 overflow-hidden" aria-labelledby="profile-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
        <h2 id="profile-title" className="text-sm font-semibold">Robot evidence profile</h2>
        <span className="text-xs text-muted">Checked <time dateTime={robot.checkedAt}>{robot.checkedAt}</time></span>
      </header>
      <div className="px-5 py-5"><ConfigurationEvidence robots={[robot]} /></div>
    </section>
    <section className="mk-detail-section" aria-labelledby="sources">
      <h2 id="sources">Sources</h2>
      <ol className="mk-sources">{robot.sources.map((item) => <li key={item.id}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title} ↗</a> <span>{item.publisher} · {item.kind} · checked {item.checkedAt}</span></li>)}</ol>
    </section>
    <p className="mk-fine">Specifications cite their sources. Capabilities without a field-level citation are marked in the configuration details. Missing values stay unknown.</p>
  </main>;
}
