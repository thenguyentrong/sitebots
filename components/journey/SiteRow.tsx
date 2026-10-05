import Link from 'next/link';
import type { Answer } from '@/lib/market/answer';
import cutouts from '@/lib/market/cutouts.json';
import { placeLabel } from '@/lib/market/places';

// Under the hero's 3D row (robots sold here, not yet at work on sites): the machines that are. Each
// is a job in daily use with a robot you can buy in Germany, shown as the maker's product photo with
// the background removed (scripts/assets/cutouts.ts). Makers rarely publish heights, so the row is
// not to scale, and says so.

type Cutout = { src: string; width: number; height: number; credit: string; pageUrl: string };
const CUTOUTS = cutouts as Record<string, Cutout>;

export function SiteRow({ answer }: { answer: Answer }) {
  const seen = new Set<string>();
  const items = answer.proven.filter((job) => job.buy?.stage === 'deployment').flatMap((job) => {
    const robot = job.buy!;
    const cutout = CUTOUTS[robot.robotId];
    if (!cutout || seen.has(robot.robotId)) return [];
    seen.add(robot.robotId);
    return [{ job, robot, cutout, place: placeLabel(robot.where), year: robot.date?.slice(0, 4) ?? '' }];
  });
  if (items.length < 3) return null;
  return <section className="home-strip" aria-labelledby="strip-title">
    <div className="home-strip-inner">
      <div className="home-strip-head">
        <h2 id="strip-title" className="home-eyebrow">Working on construction sites today · sold in Germany</h2>
        <p>The robots above are sold here but not in daily use on sites yet. These machines are, on named projects. Maker photos with the background removed; not to scale.</p>
      </div>
      <ol className="home-strip-row">
        {items.map(({ job, robot, cutout, place, year }) => <li key={robot.robotId}>
          <Link href={job.href}>
            <span className="home-strip-pic"><img src={cutout.src} alt={robot.name} width={cutout.width} height={cutout.height} loading="lazy" decoding="async" /></span>
            <strong>{job.title}</strong>
            <span>{robot.name}</span>
            <small>{[place, year].filter(Boolean).join(', ')}</small>
          </Link>
          <small className="home-strip-credit">Photo: {cutout.credit}</small>
        </li>)}
      </ol>
      <p className="home-strip-swipe" aria-hidden="true">Swipe sideways to see all {items.length} →</p>
    </div>
  </section>;
}
