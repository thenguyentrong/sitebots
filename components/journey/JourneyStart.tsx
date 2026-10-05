import { getImageProps } from 'next/image';
import Link from 'next/link';
import { ExplorerFromUrl } from '@/components/market/ExplorerFromUrl';
import type { JobDetail, JobMapPoint } from '@/lib/market/jobs';
import { LINEUP } from '@/lib/models/lineup';
import { SITE } from '@/lib/site';
import { HomeHero } from './HomeHero';
import { Icon } from './Icon';

/** The hero's stills, rendered from the live job site by scripts/assets/render-lineup.mjs: the desktop
 *  poster under the live scene, and the strip phones scroll sideways. */
const POSTER = { src: '/branding/lineup-hero.8305070783.webp', width: 1920, height: 1015 };
const STRIP = { src: '/branding/lineup-strip.3761f57775.webp', width: 2400, height: 640 };
const ALT = 'A construction worker in a hard hat, 1.80 m tall, and five robots you can buy or order in Germany side by side at true scale on a construction yard, under a line at his height. The Unitree H1-2 reaches the line, the Unitree G1 comes to his shoulder, the Unitree G1-D stands on a wheeled base, and the two robot dogs, Boston Dynamics Spot and Unitree B2, reach his hip.';

/** The landing: the job site at true scale behind the headline, then the job map with the robots you can buy in Germany. */
export function JourneyStart({ jobs, initialDetail, sold }: { jobs: JobMapPoint[]; initialDetail: JobDetail | null; sold: { robots: number; machines: number } }) {
  const { props: { srcSet: strip } } = getImageProps({ alt: '', ...STRIP, sizes: '1200px' });
  const { props: poster } = getImageProps({ alt: ALT, ...POSTER, sizes: '100vw', loading: 'eager', fetchPriority: 'high' });
  return <>
    <HomeHero
      poster={<picture><source media="(max-width: 767px)" srcSet={strip} sizes="1200px" /><img {...poster} alt={ALT} className="home-stage-poster" /></picture>}
      note={<>Sold in Germany, at true scale next to a 1.80&nbsp;m site worker<span className="home-note-robots">: {LINEUP.map((robot, i) => <span key={robot.href}>{i ? (i === LINEUP.length - 1 ? ' and ' : ', ') : ''}<Link href={robot.href}>{robot.name}</Link></span>)}</span>. Rendered from their published models; the jobs are illustrations from the job map, not footage.</>}>
      <p className="home-eyebrow">{jobs.length} jobs on the map · {sold.robots} robots sold in Germany</p>
      <h1 id="home-title">Which jobs can robots do today? <span>And where do you buy them in Germany?</span></h1>
      <p className="home-lede">Pick a job, from drywall to plant-room rounds. See the robots that fit it, compare them and find a seller.</p>
      <div className="home-actions">
        <a className="home-cta" href="#explore">Explore the job map <Icon name="arrow" size={16} /></a>
        <Link className="home-cta-ghost" href="/robots">Robots sold in Germany</Link>
      </div>
    </HomeHero>
    <div className="jp-page plan-page home-below">
      <ExplorerFromUrl jobs={jobs} initialDetail={initialDetail} contact={SITE.email || undefined} />
    </div>
  </>;
}
