import Link from 'next/link';
import { CostBars } from '@/components/costs/CostBars';
import { blocks, loadTradeShares, type BuildingType, type Trade } from '@/lib/costs/shares';
import { publicMetadata } from '@/lib/seo';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';
import '@/components/costs/costs.css';

export const metadata = publicMetadata({
  title: 'Where the money goes',
  description: 'What each construction trade costs as a share of a new building or of civil works in Germany, and how much of each branch\'s output goes to wages. From the official Destatis price index weights and cost structure survey.',
  path: '/costs',
});
type Search = Promise<{ type?: string }>;

const GROUPS: { id: Trade['section']; title: string; de: string; intro: string }[] = [
  { id: 'rohbau', title: 'Shell', de: 'Rohbau', intro: 'Earthworks, concrete, masonry, carpentry, roof: the structure and its envelope.' },
  { id: 'ausbau', title: 'Finishing', de: 'Ausbau', intro: 'Facades, windows and doors, plaster, drywall, screed, tiles, floors and paint.' },
  { id: 'tga', title: 'Building services', de: 'Technische Gebäudeausrüstung', intro: 'Heating, plumbing, electrical, ventilation, automation and lifts. Destatis counts them as Ausbau; they are shown apart here.' },
];
const PART = { rohbau: 'Shell', ausbau: 'Finishing', tga: 'Building services' } as const;
const tasks = (setting: string | null) => (setting ? '/use-cases?setting=' + setting : null);
const pct = (value: number) => value.toLocaleString('en-GB', { maximumFractionDigits: 1 }) + '%';

/** Where the money goes on a German build, by trade, from official statistics only. */
export default async function CostsPage({ searchParams }: { searchParams: Search }) {
  const { type: requested } = await searchParams;
  const data = loadTradeShares();
  const types = data.buildings.types;
  const type = (types.some((t) => t.id === requested) ? requested : 'wohn') as BuildingType;
  const current = types.find((t) => t.id === type)!;
  const split = Object.fromEntries(types.map((t) => [t.id, blocks(data, t.id)])) as Record<BuildingType, ReturnType<typeof blocks>>;
  const range = (trade: Trade) => {
    const values = types.map((t) => trade.values[t.id]).filter((v): v is number => v !== null);
    return { min: Math.min(...values), max: Math.max(...values) };
  };
  const { weights, labour } = data.sources;
  return <main className="cs-page">
    <header className="cs-head">
      <h1>Where the money goes</h1>
      <p>What each trade costs as a share of a new building or of civil works in Germany, and how much of each branch&apos;s output goes to wages. From the weights of the official construction price index, taken from the settled accounts of real projects, and the cost structure survey of construction firms.</p>
    </header>

    <section className="cs-section" aria-labelledby="split">
      <h2 id="split">Shell or finishing: which costs more?</h2>
      <p className="cs-answer">Finishing and building services together cost more than the shell in housing ({pct(split.wohn.ausbau + split.wohn.tga)} against {pct(split.wohn.rohbau)}) and in offices ({pct(split.buero.ausbau + split.buero.tga)}). On its own, the shell is still the largest block in housing; in offices finishing is. In commercial and industrial buildings the shell takes over half ({pct(split.gewerbe.rohbau)}).</p>
      <div className="cs-split">{types.map((t) => <div key={t.id} className="cs-split-row">
        <p>{t.en}<small lang="de">{t.de}</small></p>
        <div className="cs-split-bar" role="img" aria-label={t.en + ': ' + (['rohbau', 'ausbau', 'tga'] as const).map((part) => PART[part] + ' ' + pct(split[t.id][part])).join(', ')}>
          {(['rohbau', 'ausbau', 'tga'] as const).map((part) => <span key={part} data-part={part} style={{ width: split[t.id][part] + '%' }}>{pct(split[t.id][part])}</span>)}
        </div>
      </div>)}</div>
      <p className="cs-legend">{(['rohbau', 'ausbau', 'tga'] as const).map((part) => <span key={part} data-part={part}>{PART[part]}</span>)}</p>
      <p className="cs-fine">Shares of the work on the structure (DIN 276 cost groups 300 and 400, without land, fees and outdoor areas). Destatis groups the trades into Rohbau ({pct(data.buildings.totals[type].rohbau)}) and Ausbau ({pct(data.buildings.totals[type].ausbau)}) for {current.en.toLowerCase()}; the building services are split out of Ausbau by sitebots.</p>
    </section>

    <section className="cs-section" aria-labelledby="trades">
      <div className="cs-section-head">
        <div><h2 id="trades">What each trade costs</h2><p className="cs-lede">Share of the cost of {current.en.toLowerCase()}. The thin line spans the same trade across all three building types. Select a trade for its tasks.</p></div>
        <nav className={ui.segment} aria-label="Building type">{types.map((t) => <Link key={t.id} href={'/costs?type=' + t.id + '#trades'} scroll={false} className={cn(ui.segmentItem, t.id === type && ui.segmentActive)} aria-current={t.id === type ? 'page' : undefined}>{t.en.replace(' buildings', '')}</Link>)}</nav>
      </div>
      {GROUPS.map((group) => {
        const rows = data.buildings.trades.filter((trade) => trade.section === group.id && trade.values[type] !== null);
        return <div key={group.id} className="cs-group">
          <h3>{group.title}<small lang="de">{group.de}</small></h3>
          <p>{group.intro}</p>
          <CostBars caption={group.title + ' trades, share of the cost of ' + current.en.toLowerCase()} items={rows.map((trade) => ({
            key: trade.de, label: trade.en, de: trade.de, value: trade.values[type]!, ...range(trade), href: tasks(trade.setting),
            title: types.map((t) => t.en + ': ' + (trade.values[t.id] === null ? 'not weighted' : pct(trade.values[t.id]!))).join(' · '),
          }))} scale={25} />
        </div>;
      })}
    </section>

    <section className="cs-section" aria-labelledby="civil">
      <h2 id="civil">Civil works</h2>
      <p className="cs-lede">Share of the cost of each kind of civil works, by work type.</p>
      <div className="cs-civil">{data.civil.types.map((t) => <div key={t.id} className="cs-group">
        <h3>{t.en}<small lang="de">{t.de}</small></h3>
        <CostBars caption={t.en + ', share of cost by work type'} items={data.civil.works.filter((work) => (work.values[t.id] ?? 0) >= 0.5).map((work) => ({ key: work.de, label: work.en, de: work.de, value: work.values[t.id]!, href: tasks(work.setting) }))} scale={60} />
      </div>)}</div>
    </section>

    <section className="cs-section" aria-labelledby="labour">
      <h2 id="labour">Where wages are the biggest cost</h2>
      <p className="cs-lede">Personnel costs as a share of the gross output of construction firms, by branch. The rest goes to materials, subcontracted work, equipment and overheads. A higher share means more of the work is done by the firm's own people.</p>
      <CostBars caption="Personnel costs as a share of gross output by branch" items={data.labour.filter((branch) => !branch.wz.startsWith('41.1') && branch.wz.split('.').join('').length >= 4 && !data.labour.some((other) => other.wz.startsWith(branch.wz + '.'))).map((branch) => ({ key: branch.wz, label: branch.en, de: branch.wz + ' ' + branch.de, value: branch.value }))} scale={50} />
    </section>

    <section className="cs-section" aria-labelledby="sources">
      <h2 id="sources">Sources</h2>
      <ul className="cs-sources">
        <li><a href={weights.url} target="_blank" rel="noopener noreferrer">{weights.title} ↗</a><small>{weights.publisher}, published {weights.published}. {weights.basis}</small></li>
        <li><a href={labour.url} target="_blank" rel="noopener noreferrer">{labour.title} ↗</a><small>{labour.publisher}, published {labour.published}. {labour.basis}</small></li>
      </ul>
      <p className="cs-fine">Every value is read from these two publications; checked {data.checkedAt}. Each trade links to its tasks in the library, where the work is shown step by step.</p>
    </section>
  </main>;
}
