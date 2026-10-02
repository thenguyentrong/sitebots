import Link from 'next/link';
import { StationHead } from '@/components/journey/StationHead';
import { Steps } from '@/components/journey/Steps';
import { loadContent } from '@/lib/content/load';
import { SITE_SECTIONS } from '@/lib/content/vocab';
import { SECTION_LABELS, lbLabel, tasksLabel } from '@/lib/journey/labels';
import { publicMetadata } from '@/lib/seo';
import { settingOptions } from '@/lib/tasks/cards';
import { byLv } from '@/lib/tasks/order';
import '../../plan/plan.css';
import '../../plan/journey.css';

export const dynamic = 'force-dynamic';
export const metadata = publicMetadata({
  title: 'Task criteria',
  description: 'How work becomes a task in the library: the LV anchor (STLB-Bau Leistungsbereich and VOB/C ATV), the selection criteria and the requirement profile with the source of every value.',
  path: '/use-cases/criteria',
});

const STLB = 'https://www.abst-brandenburg.de/wp-content/uploads/2024/09/STLB_%C3%9Cbersicht-STLB-Bau-Version-2024-04.pdf';
const VOB = 'https://www.vob-online.de/resource/blob/714600/a6af4fca7686196bd540cbe9e8087eea/inhaltsverzeichnis-teil-c-vob-2019-gesamtausgabe-data.pdf';

const CRITERIA: [string, string][] = [
  ['Construction classification', 'For the current construction collection, the task belongs to an LV position type of one STLB-Bau Leistungsbereich and falls under its VOB/C ATV, so a contractor finds it in their own Leistungsverzeichnis. Work outside the LV (surveying, site documentation) says so.'],
  ['It repeats', 'It recurs on most projects of that trade, not once per building.'],
  ['Physical and bounded', 'One kind of object, one place, a clear start and end: “fix CW studs into UW tracks”, not “build the drywall”.'],
  ['Done by people today', 'Or by a machine whose place is the question.'],
  ['Sourced', 'Every value comes from a norm, a manufacturer datasheet, a trade body or a published study, or it is marked as an assumption with the reason. A value that cannot be sourced stays open.'],
];

const PROFILE: [string, string][] = [
  ['Heaviest single object', 'Manufacturer datasheet: mass per piece, or mass per m² times the standard format'],
  ['Largest object dimension', 'Datasheet or product standard formats'],
  ['Working height', 'Where the work is: floor, wall or ceiling, from typical storey heights'],
  ['Tolerance the result must meet', 'DIN 18202 or the product’s installation rules, from a page that states it'],
  ['Force the work takes', 'Manufacturer data for drilling, pressing or pulling'],
  ['Error cost and safety relevance', 'Whether the result is structural, fire- or life-safety relevant, per the norm or building regulation'],
  ['Dust', 'TRGS 559 (quartz), TRGS 553 (wood), TRGS 519 (asbestos) and the work step'],
  ['Indoor or outdoor, wet, floor', 'Where the trade works'],
  ['Machines that already do it', 'Manufacturer product pages'],
  ['Variability', 'Analyst judgement from the number of variants per LV position; always marked as judgement'],
];

/** The rules behind the library, with the live count of trades and tasks per LV section. */
export default function CriteriaPage() {
  const settings = settingOptions(loadContent()).filter((s) => s.group === 'site');
  return <main className="jp-page plan-page">
    <Steps />
    <StationHead title="How a task gets into the library" lede="The task library records requirements and possible approaches. Evidence for a specific robot and complete solution is reviewed separately." />
    <div className="jp-body"><section className="jp-card"><div className="jp-card-head"><h2>Requirements first, product evidence second</h2><p>Loads, access, dust, water, runtime, accuracy and existing equipment describe the task. They do not impose one universal limit across robot types. Missing information remains a question; a complete task profile is not approval of any product.</p><p>Compare the current process, dedicated equipment, fixed cells and mobile robots where relevant. Verify the exact hardware, tooling, software, supervision and conditions for each option. Manufacturer-supported specifications, seller reports and deployment evidence are distinct.</p></div></section>
      <section className="jp-card" aria-labelledby="lv-structure">
        <div className="jp-card-head"><p className="jp-kicker">Where a task sits</p><h2 id="lv-structure">Construction sites, sorted like a Leistungsverzeichnis</h2><p>Each trade is an STLB-Bau Leistungsbereich (<a className="jp-link text-foreground" href={STLB} target="_blank" rel="noopener noreferrer">list as of April 2024</a>) with the VOB/C ATV that governs it (<a className="jp-link text-foreground" href={VOB} target="_blank" rel="noopener noreferrer">VOB 2019 contents</a>). The seven sections are our grouping, in LV order. Factories, yards and buildings in operation are sorted by kind of plant or asset.</p></div>
        <table className="criteria-table">
          <thead><tr><th>Section</th><th>Trades (Leistungsbereich)</th><th>Tasks</th></tr></thead>
          <tbody>{SITE_SECTIONS.map((section) => {
            const list = settings.filter((s) => s.section === section).sort(byLv);
            return <tr key={section}><td><strong>{SECTION_LABELS[section].en}</strong><span className="jp-small block">{SECTION_LABELS[section].de}</span></td><td>{list.map((s, i) => <span key={s.id}>{i ? ' · ' : ''}<Link className="jp-link" href={'/use-cases?setting=' + s.id}>{lbLabel(s.lv?.lb) ? lbLabel(s.lv?.lb) + ' ' : ''}{s.title.en}</Link></span>)}</td><td className="whitespace-nowrap">{tasksLabel(list.reduce((n, s) => n + s.records, 0))}</td></tr>;
          })}</tbody>
        </table>
      </section>

      <section className="jp-card" aria-labelledby="which">
        <div className="jp-card-head"><p className="jp-kicker">Selection</p><h2 id="which">Which work becomes a task</h2></div>
        <ol className="criteria-list">{CRITERIA.map(([title, text]) => <li key={title}><span><strong>{title}.</strong> {text}</span></li>)}</ol>
      </section>

      <section className="jp-card" aria-labelledby="profile">
        <div className="jp-card-head"><p className="jp-kicker">Requirement profile</p><h2 id="profile">What each task records, and from where</h2><p>Confidence follows the rest of the site: confirmed when the linked page states the value, likely when it is derived from one (for example kg per m² times the board format), assumed when no source exists; the note says which.</p></div>
        <table className="criteria-table">
          <thead><tr><th>Requirement</th><th>Typical source</th></tr></thead>
          <tbody>{PROFILE.map(([what, source]) => <tr key={what}><td><strong>{what}</strong></td><td>{source}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="jp-card" aria-labelledby="numbers">
        <div className="jp-card-head"><p className="jp-kicker">Numbers on the page</p><h2 id="numbers">What the counts mean</h2><p>The count next to a trade, plant or group (“4 tasks”) is how many recorded task opportunities the library holds for it. A count is not a suitability score. The review shows which requirements are provided and which need clarification, alongside approaches and evidence to investigate. Previous humanoid verdicts are retained only as labelled historical assessments.</p></div>
      </section>
    </div>
  </main>;
}
