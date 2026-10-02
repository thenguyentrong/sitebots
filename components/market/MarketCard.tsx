import Link from 'next/link';
import { RobotGlyph } from '@/components/robot/RobotGlyph';
import { STATUS_LABELS, TYPE_LABELS, priceText, type RobotCardData } from '@/lib/market/cards';

/** A robot in the market list: picture, price in Germany, sellers and how many jobs it fits. */
export function MarketCard({ robot, jobs }: { robot: RobotCardData; jobs: number }) {
  return <Link href={robot.href} className="mk-robot mk-robot-link" data-robot={robot.id}>
    <div className="mk-robot-pic">
      {robot.picture ? <img className="mk-robot-img" src={robot.picture.src} alt={robot.picture.alt} width={robot.picture.width} height={robot.picture.height} loading="lazy" decoding="async" />
        : <RobotGlyph formFactor={robot.robotType === 'specialised' ? 'dedicated_robot' : robot.robotType} className="mk-glyph" />}
    </div>
    <div className="mk-robot-body">
      <p className="mk-maker">{TYPE_LABELS[robot.robotType]} · {robot.body}</p>
      <h4>{robot.name}</h4>
      <p className="mk-card-summary">{robot.summary}</p>
      <div className="mk-price">
        <strong>{priceText(robot)}</strong>
        <span className="mk-status" data-s={robot.germany.status}>{STATUS_LABELS[robot.germany.status]}</span>
      </div>
      <p className="mk-fine">{robot.germany.sellers.length ? robot.germany.sellers.length + ' seller' + (robot.germany.sellers.length > 1 ? 's' : '') + ' · ' : ''}{jobs ? 'fits ' + jobs + ' job' + (jobs > 1 ? 's' : '') + ' on the map' : 'no job on the map yet'}</p>
    </div>
  </Link>;
}
