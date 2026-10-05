import Link from 'next/link';
import type { Answer } from '@/lib/market/answer';
import { PROOF, PROOF_LABELS } from '@/lib/market/vocab';

// The answer by trade: every construction-site job as one square in its trade, coloured by its best
// proof, and a spider chart of fits on paper against done on real sites per kind of work. Server
// rendered; the squares link to their jobs and name them on hover.

const PROVEN = PROOF.indexOf('pilot');
const pct = (part: number, whole: number) => Math.round(part / whole * 100);

function Squares({ jobs }: { jobs: Answer['trades'][number]['jobs'] }) {
  return <span className="trade-squares">{jobs.map((job) => {
    const label = job.title + ': ' + PROOF_LABELS[job.level].toLowerCase() + (job.abroad ? ', only with robots not sold in Germany' : '');
    return <Link key={job.id} href={job.href} className="trade-sq" data-level={job.level} data-abroad={job.abroad ? '' : undefined} title={label} aria-label={label} />;
  })}</span>;
}

/** The spider: one axis per kind of work, 0–100 % from the centre. The grey outline is what fits on
 *  paper, the filled shape what is done on real sites; the gap between them is the point. */
function Spider({ kinds }: { kinds: Answer['kinds'] }) {
  const W = 720, H = 440, cx = W / 2, cy = 222, R = 160;
  const angle = (index: number) => -Math.PI / 2 + index * 2 * Math.PI / kinds.length;
  const at = (index: number, share: number) => [cx + Math.cos(angle(index)) * R * share, cy + Math.sin(angle(index)) * R * share] as const;
  const shape = (share: (kind: Answer['kinds'][number]) => number) => kinds.map((kind, index) => at(index, share(kind)).map((value) => value.toFixed(1)).join(',')).join(' ');
  const paper = (kind: Answer['kinds'][number]) => kind.paper / kind.jobs;
  const proven = (kind: Answer['kinds'][number]) => kind.proven / kind.jobs;
  return <svg viewBox={`0 0 ${W} ${H}`} className="spider" role="img" aria-labelledby="spider-title spider-desc">
    <title id="spider-title">Construction-site jobs that robots fit on paper and that robots did on real sites, by kind of work</title>
    <desc id="spider-desc">{kinds.map((kind) => `${kind.label}: ${pct(kind.paper, kind.jobs)}% fit on paper, ${pct(kind.proven, kind.jobs)}% done on real sites, of ${kind.jobs} jobs`).join('; ')}</desc>
    <g className="spider-grid" aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map((ring) => <polygon key={ring} points={kinds.map((_, index) => at(index, ring).map((value) => value.toFixed(1)).join(',')).join(' ')} />)}
      {kinds.map((kind, index) => { const [x, y] = at(index, 1); return <line key={kind.id} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} />; })}
      <text x={cx + 4} y={cy - R * 0.5 - 4}>50%</text>
      <text x={cx + 4} y={cy - R - 4}>100%</text>
    </g>
    <polygon className="spider-paper" points={shape(paper)}><title>Fits on paper</title></polygon>
    <polygon className="spider-proven" points={shape(proven)}><title>Done on real sites</title></polygon>
    {kinds.map((kind, index) => {
      const [x, y] = at(index, proven(kind));
      return <circle key={kind.id} className="spider-dot" cx={x.toFixed(1)} cy={y.toFixed(1)} r="4"><title>{`${kind.label}: ${kind.proven} of ${kind.jobs} jobs done on real sites`}</title></circle>;
    })}
    {kinds.map((kind, index) => {
      const [x, y] = at(index, 1.12);
      const cos = Math.cos(angle(index));
      const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
      const top = Math.sin(angle(index)) < -0.9;
      return <text key={kind.id} className="spider-label" x={x.toFixed(1)} y={(y + (top ? -18 : 0)).toFixed(1)} textAnchor={anchor}>
        <tspan x={x.toFixed(1)} className="spider-name">{kind.label}</tspan>
        <tspan x={x.toFixed(1)} dy="16" className="spider-values">done {pct(kind.proven, kind.jobs)}% · paper {pct(kind.paper, kind.jobs)}% · {kind.jobs} jobs</tspan>
      </text>;
    })}
  </svg>;
}

export function TradeChart({ answer }: { answer: Answer }) {
  const proven = answer.trades.filter((trade) => trade.jobs.some((job) => PROOF.indexOf(job.level) >= PROVEN));
  const shown = answer.trades.filter((trade) => !proven.includes(trade) && trade.jobs.some((job) => job.level !== 'none'));
  const empty = answer.trades.filter((trade) => trade.jobs.every((job) => job.level === 'none'));
  // The finding under the spider: the kind of work (with enough jobs to mean something) where paper
  // and proof lie furthest apart.
  const gap = [...answer.kinds].filter((kind) => kind.jobs >= 5).sort((a, b) => (b.paper - b.proven) / b.jobs - (a.paper - a.proven) / a.jobs)[0];
  return <section id="trades" className="home-trades" aria-labelledby="trades-title">
    <p className="jp-kicker">By trade</p>
    <h2 id="trades-title">Which trades robots reach today</h2>
    <p className="home-section-lede">Each square is one construction-site job, coloured by its best proof. Robots have done work on real sites in {proven.length} of {answer.trades.length} trades. In the other {answer.trades.length - proven.length}, none has yet.</p>
    <ul className="trade-rows" aria-label="Trades with any proof">
      {[...proven, ...shown].map((trade) => <li key={trade.name}><span className="trade-name">{trade.name}</span><Squares jobs={trade.jobs} /></li>)}
    </ul>
    <p className="trade-empty"><strong>No proof yet in {empty.length} trades:</strong> {empty.map((trade, index) => <span key={trade.name}>{index ? ' · ' : ''}{trade.name} <Squares jobs={trade.jobs} /></span>)}</p>
    <div className="spider-layout">
      <figure className="trades-spider"><Spider kinds={answer.kinds} /></figure>
      <div className="spider-side">
        <h3>On paper or on a real site?</h3>
        {gap ? <p>{gap.label}: robots you can buy in Germany fit {pct(gap.paper, gap.jobs)}% of these jobs on paper, but only {pct(gap.proven, gap.jobs)}% have been done on real sites. The gap between the two shapes is how far the market is ahead of the proof.</p> : null}
        <p className="spider-key"><i className="is-proven" aria-hidden="true" />Done on real sites: daily use or a pilot, by any robot</p>
        <p className="spider-key"><i className="is-paper" aria-hidden="true" />Fits on paper: a robot you can buy in Germany fits what the job needs</p>
        <table className="spider-table">
          <caption className="sr-only">Site jobs by kind of work: fit on paper and done on real sites</caption>
          <thead><tr><th scope="col">Kind of work</th><th scope="col">Jobs</th><th scope="col">Paper</th><th scope="col">Done</th></tr></thead>
          <tbody>{answer.kinds.map((kind) => <tr key={kind.id}><th scope="row">{kind.label}</th><td>{kind.jobs}</td><td>{pct(kind.paper, kind.jobs)}%</td><td>{pct(kind.proven, kind.jobs)}%</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  </section>;
}
