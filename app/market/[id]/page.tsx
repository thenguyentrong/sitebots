import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { BuyBox, RobotEvidence, RobotJobs } from '@/components/market/GermanyBuy';
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

const yesNo = (value: boolean | null) => value === null ? 'Not published' : value ? 'Yes' : 'No';
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
  const source = (sourceId: string) => robot.sources.find((item) => item.id === sourceId);
  const c = robot.capabilities;
  const facts: [string, string][] = [
    ['Moves on', bodyLabel(robot).replace(/^On /, '')],
    ['Stairs', yesNo(c.stairs)],
    ['Rough ground', yesNo(c.roughGround)],
    ['Outdoors', yesNo(c.outdoor)],
    ['Arms', c.arms ? String(c.arms) : 'None'],
    ['Hands', HANDS[c.hands] + (c.hands !== 'none' && c.handsIncluded === false ? ', not included' : '')],
    ['Payload per arm', c.armPayloadKg === null ? 'Not published' : c.armPayloadKg + ' kg'],
    ['Carries on body', c.carryPayloadKg === null ? 'Not published' : c.carryPayloadKg + ' kg'],
    ['Runtime', c.runtimeH === null ? 'Not published' : c.runtimeH + ' h'],
    ['Protection', c.ipRating ?? 'Not published'],
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

    {robot.specs.length ? <section className="mk-detail-section" aria-labelledby="specs">
      <h2 id="specs">Published specifications</h2>
      <div className="mk-table-scroll"><table className="mk-spec-table"><tbody>{robot.specs.map((spec) => <tr key={spec.key}>
        <th scope="row">{spec.label}</th>
        <td>{typeof spec.value === 'boolean' ? (spec.value ? 'Yes' : 'No') : String(spec.value)}{spec.unit ? ' ' + spec.unit : ''}{spec.conditions ? <small> · {spec.conditions}</small> : null}</td>
        <td>{source(spec.sourceId) ? <a href={source(spec.sourceId)!.url} target="_blank" rel="noopener noreferrer">{source(spec.sourceId)!.publisher} ↗</a> : null}</td>
      </tr>)}</tbody></table></div>
    </section> : null}

    {robot.openQuestions.length ? <section className="mk-detail-section" aria-labelledby="open">
      <h2 id="open">Ask the seller</h2>
      <ul className="mk-notes">{robot.openQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
    </section> : null}

    <section className="mk-detail-section" aria-labelledby="sources">
      <h2 id="sources">Sources</h2>
      <ol className="mk-sources">{robot.sources.map((item) => <li key={item.id}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title} ↗</a> <span>{item.publisher} · {item.kind} · checked {item.checkedAt}</span></li>)}</ol>
    </section>
    <p className="mk-fine">Every value links to the page it was read from. What no source states stays unknown.</p>
  </main>;
}
