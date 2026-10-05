import { getImageProps } from 'next/image';
import Link from 'next/link';
import { ExplorerFromUrl } from '@/components/market/ExplorerFromUrl';
import type { Answer } from '@/lib/market/answer';
import type { JobDetail, JobMapPoint } from '@/lib/market/jobs';
import { LINEUP } from '@/lib/models/lineup';
import { SITE } from '@/lib/site';
import { HomeHero } from './HomeHero';
import { Icon } from './Icon';
import { TodayAnswer } from './TodayAnswer';
import { TradeChart } from './TradeChart';

/** The hero's stills, rendered from the live job site by scripts/assets/render-lineup.mjs: the desktop
 *  poster under the live scene, and the strip phones scroll sideways. */
const POSTER = { src: '/branding/lineup-hero.8305070783.webp', width: 1920, height: 1015 };
const STRIP = { src: '/branding/lineup-strip.3761f57775.webp', width: 2400, height: 640 };
const ALT = 'A construction worker in a hard hat, 1.80 m tall, and five robots you can buy or order in Germany side by side at true scale on a construction yard, under a line at his height. The Unitree H1-2 reaches the line, the Unitree G1 comes to his shoulder, the Unitree G1-D stands on a wheeled base, and the two robot dogs, Boston Dynamics Spot and Unitree B2, reach his hip.';

const names = (list: string[]) => list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list.at(-1) : list[0] ?? '';

/** How far the robots in the row have got on construction sites, so the picture does not promise more
 *  than the sources show. */
function lineupProof(levels: Answer['lineup']): string {
  const at = (level: string) => LINEUP.filter((robot) => levels[robot.href] === level).map((robot) => robot.name);
  const inUse = at('deployment'), piloted = at('pilot');
  if (!inUse.length && !piloted.length) return 'None of them works on construction sites yet.';
  const parts = [
    ...(inUse.length ? [names(inUse) + (inUse.length > 1 ? ' are' : ' is') + ' in daily use on sites'] : []),
    ...(piloted.length ? [names(piloted) + (piloted.length > 1 ? ' have' : ' has') + ' been tested in pilots'] : []),
  ];
  return 'On construction sites, ' + parts.join('; ') + (inUse.length + piloted.length < LINEUP.length ? '; the others not yet.' : '.');
}

/** The headline's short answer, counted from the proof on the market records. */
function shortAnswer(answer: Answer): string {
  const general = answer.general.levels.deployment;
  const who = general ? `, ${general} of them with humanoids, robot dogs or mobile manipulators` : ', all with machines built for one job';
  const here = answer.inUseHere ? ` For ${answer.inUseHere} of them you can buy one in Germany.` : '';
  return `Today robots are in daily use on ${answer.levels.deployment} of ${answer.checked} construction-site jobs${answer.levels.deployment ? who : ''}.${here} See the proof, the robots and who sells them.`;
}

/** The landing: the job site at true scale behind the headline, the answer, then the job map with the robots you can buy in Germany. */
export function JourneyStart({ jobs, initialDetail, sold, answer }: { jobs: JobMapPoint[]; initialDetail: JobDetail | null; sold: { robots: number; machines: number }; answer: Answer }) {
  const { props: { srcSet: strip } } = getImageProps({ alt: '', ...STRIP, sizes: '1200px' });
  const { props: poster } = getImageProps({ alt: ALT, ...POSTER, sizes: '100vw', loading: 'eager', fetchPriority: 'high' });
  return <>
    <HomeHero
      poster={<picture><source media="(max-width: 767px)" srcSet={strip} sizes="1200px" /><img {...poster} alt={ALT} className="home-stage-poster" /></picture>}
      note={<>Sold in Germany, at true scale next to a 1.80&nbsp;m site worker<span className="home-note-robots">: {LINEUP.map((robot, i) => <span key={robot.href}>{i ? (i === LINEUP.length - 1 ? ' and ' : ', ') : ''}<Link href={robot.href}>{robot.name}</Link></span>)}</span>. {lineupProof(answer.lineup)} Rendered from their published models; the jobs are illustrations from the job map, not footage.</>}>
      <p className="home-eyebrow">{answer.checked} site jobs checked · {sold.robots + sold.machines} robots and machines sold in Germany</p>
      <h1 id="home-title">Which jobs can robots do today? <span>And where do you buy them in Germany?</span></h1>
      <p className="home-lede">{shortAnswer(answer)}</p>
      <div className="home-actions">
        <a className="home-cta" href="#today">See what robots do today <Icon name="arrow" size={16} /></a>
        <Link className="home-cta-ghost" href="/robots">Robots sold in Germany</Link>
      </div>
    </HomeHero>
    <div className="jp-page plan-page home-below">
      <TodayAnswer answer={answer} total={jobs.length} />
      <TradeChart answer={answer} />
      <ExplorerFromUrl jobs={jobs} initialDetail={initialDetail} contact={SITE.email || undefined} />
    </div>
  </>;
}
