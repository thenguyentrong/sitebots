import Link from 'next/link';
import type { TileData } from '@/lib/market/tiles';
import { RobotTile } from './RobotTile';
import './market.css';

/** One robot type on the robots page, the same in the German and the worldwide view. */
export function TileSection({ id, title, count, intro, tiles, more }: { id: string; title: string; count: number; intro: string; tiles: TileData[]; more?: { href: string; label: string } | null }) {
  return <section className="mk-page-section" aria-labelledby={id}>
    <div className="mk-page-section-head"><h2 id={id}>{title} <span>{count}</span></h2><p>{intro}</p></div>
    <div className="mk-grid">{tiles.map((tile) => <RobotTile key={tile.id} tile={tile} />)}</div>
    {more ? <p className="mk-show-all"><Link href={more.href}>{more.label} →</Link></p> : null}
  </section>;
}
