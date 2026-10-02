import Image from 'next/image';
import Link from 'next/link';
import { MarketExplorer, type ExplorerInitial } from '@/components/market/MarketExplorer';
import type { JobDetail, JobMapPoint } from '@/lib/market/jobs';
import { SITE } from '@/lib/site';
import { ui } from '@/lib/ui';
import { Icon } from './Icon';

/** The robots in the landing image, left to right; all can be bought or ordered in Germany. */
const LINEUP = [
  { name: 'Unitree H1-2', href: '/robots/unitree/h1-2' },
  { name: 'Unitree G1', href: '/robots/unitree/g1' },
  { name: 'Unitree G1-D', href: '/robots/unitree/g1-d' },
  { name: 'Boston Dynamics Spot', href: '/robots/boston-dynamics/spot' },
  { name: 'Unitree B2', href: '/robots/unitree/b2' },
];

/** The landing: a lineup at true scale, then the job map with the robots you can buy in Germany. */
export function JourneyStart({ jobs, initialDetail, sold, initial }: { jobs: JobMapPoint[]; initialDetail: JobDetail | null; sold: { robots: number; machines: number }; initial: ExplorerInitial }) {
  return <>
    <section className="home-hero" aria-labelledby="home-title">
      <h1 id="home-title">Which jobs can robots do today? <span>And where do you buy them in Germany?</span></h1>
      <p className="jp-lede">Every dot on the map below is a job, from drywall to plant-room rounds. Pick one to see the humanoids, robot dogs and other robots that fit it, compare them and find a seller.</p>
      <div className="home-actions">
        <a className={ui.btn} href="#explore">Explore the job map <Icon name="arrow" size={16} /></a>
        <Link className={ui.btnGhost} href="/robots">{sold.robots ? sold.robots + ' robots sold in Germany' : 'Robots sold in Germany'}</Link>
      </div>
    </section>

    <figure className="home-lineup">
      <div className="home-lineup-stage">
        <Image src="/branding/lineup-at-scale.76d724f288.png" width={2957} height={924} priority sizes="(min-width: 1152px) 1056px, calc(100vw - 64px)"
          alt="A construction worker in a hard hat, 1.80 m tall, and five robots you can buy or order in Germany side by side at true scale under a line at his height. The Unitree H1-2 reaches the line, the Unitree G1 comes to his shoulder, the Unitree G1-D stands on a wheeled base, and the two robot dogs, Boston Dynamics Spot and Unitree B2, reach his hip." />
      </div>
      <figcaption>Sold in Germany, at true scale next to a 1.80 m site worker: {LINEUP.map((robot, i) => <span key={robot.href}>{i ? (i === LINEUP.length - 1 ? ' and ' : ', ') : ''}<Link href={robot.href}>{robot.name}</Link></span>)}. Rendered from their published models.</figcaption>
    </figure>

    <MarketExplorer jobs={jobs} initialDetail={initialDetail} initial={initial} contact={SITE.email || undefined} />
  </>;
}
