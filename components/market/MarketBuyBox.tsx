import { STATUS_LABELS, priceText, toCard } from '@/lib/market/cards';
import type { MarketRobot } from '@/lib/market/load';
import './market.css';

const RANK = { buy_now: 0, quote: 1, preorder: 2, not_sold: 3 } as const;

/** On a catalogue robot page: how each version of the robot can be bought in Germany. */
export function MarketBuyBox({ robots }: { robots: MarketRobot[] }) {
  if (!robots.length) return null;
  const sorted = [...robots].sort((a, b) => RANK[a.germany.status] - RANK[b.germany.status] || a.name.localeCompare(b.name));
  return <section className="card overflow-hidden mk-buy-summary" aria-labelledby="germany-status-title">
    <header className="border-b border-edge/70 px-5 py-3.5"><h2 id="germany-status-title" className="text-sm font-semibold">In Germany</h2></header>
    <ul className="divide-y divide-edge/70">{sorted.map((robot) => <li key={robot.id} className="px-5 py-3">
      <a href="#germany" className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium underline underline-offset-4">{robot.name}</span>
        <span className="mk-status" data-s={robot.germany.status}>{STATUS_LABELS[robot.germany.status]}</span>
      </a>
      <p className="mt-1 text-xs text-muted">{priceText(toCard(robot))}{robot.germany.sellers.length ? ' · ' + robot.germany.sellers.length + ' seller' + (robot.germany.sellers.length > 1 ? 's' : '') : ''}</p>
    </li>)}</ul>
  </section>;
}
