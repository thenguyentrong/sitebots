import Link from 'next/link';
import './costs.css';

export type CostBar = { key: string; label: string; de: string; value: number; min?: number; max?: number; href?: string | null; title?: string };

const nice = (value: number) => [2, 5, 10, 20, 25, 30, 40, 50, 60, 80, 100].find((step) => step >= value) ?? Math.ceil(value / 10) * 10;
const percent = (value: number) => value.toLocaleString('en-GB', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + '%';

/** Horizontal bars, largest first. A thin line shows the range of the same trade in the other
 * building types, where one is given. */
export function CostBars({ items, caption, scale }: { items: CostBar[]; caption: string; scale?: number }) {
  const rows = [...items].sort((a, b) => b.value - a.value);
  const top = scale ?? nice(Math.max(...rows.map((row) => Math.max(row.value, row.max ?? 0))));
  const at = (value: number) => Math.min(100, (value / top) * 100) + '%';
  return <figure className="cs-bars">
    <figcaption className="sr-only">{caption}</figcaption>
    <ol>{rows.map((row) => <li key={row.key} title={row.title}>
      <span className="cs-label">
        {row.href ? <Link href={row.href}>{row.label}</Link> : <span>{row.label}</span>}
        <small lang="de">{row.de}</small>
      </span>
      <span className="cs-track" aria-hidden>
        <span className="cs-bar" style={{ width: at(row.value) }} />
        {row.min !== undefined && row.max !== undefined && row.max > row.min ? <span className="cs-range" style={{ left: at(row.min), width: 'calc(' + at(row.max) + ' - ' + at(row.min) + ')' }} /> : null}
      </span>
      <span className="cs-value">{percent(row.value)}</span>
    </li>)}</ol>
    <p className="cs-axis" aria-hidden><span>0%</span><span>{top}%</span></p>
  </figure>;
}
