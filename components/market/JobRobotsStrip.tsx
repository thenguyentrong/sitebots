import Link from 'next/link';
import { RobotGlyph } from '@/components/robot/RobotGlyph';
import { STATUS_LABELS, TYPE_LABELS, priceText } from '@/lib/market/cards';
import { loadJobs } from '@/lib/market/jobs';
import { isStrong } from '@/lib/market/match';
import { STAGE_LABELS } from '@/lib/market/vocab';
import { JobProofs } from './JobProofs';
import { choicesHeading } from '@/lib/market/proof';
import './market.css';

/** On a task page: where robots have done this job, then the robots you can buy in Germany for it, best
 *  first, with a way to the full comparison. */
export function JobRobotsStrip({ jobId }: { jobId: string }) {
  const { jobs, robots } = loadJobs();
  const job = jobs.find((item) => item.id === jobId);
  if (!job) return null;
  const byId = new Map(robots.map((robot) => [robot.id, robot]));
  const strong = job.fits.options.filter(isStrong);
  const shown = (strong.length ? strong : job.fits.options).slice(0, 4);
  const href = '/?usecase=' + encodeURIComponent(job.id) + '#explore';
  return <section className="mk-strip" aria-labelledby="robots-here">
    <JobProofs proofs={job.proofs} fits={strong.length} />
    <div className="mk-strip-head">
      <h2 id="robots-here">{choicesHeading(strong, job.fits.options.length)}</h2>
      <Link href={href}>Compare them and see sellers →</Link>
    </div>
    {shown.length ? <ul className="mk-strip-list">{shown.map((fit) => {
      const robot = byId.get(fit.robotId)!;
      return <li key={fit.robotId}><Link href={robot.href}>
        {robot.picture ? <img src={robot.picture.src} alt={robot.picture.alt} width={robot.picture.width} height={robot.picture.height} loading="lazy" decoding="async" /> : <RobotGlyph formFactor={robot.robotType === 'specialised' ? 'dedicated_robot' : robot.robotType} className="mk-glyph" />}
        <span className="mk-strip-text"><small>{TYPE_LABELS[robot.robotType]}</small><strong>{robot.name}</strong><small>{fit.evidence ? STAGE_LABELS[fit.evidence.stage] : fit.verdict === 'similar' ? 'Did similar work' : fit.verdict === 'fits' ? 'Fits on paper' : 'Needs add-ons or a trial'} · {priceText(robot)}</small></span>
        <span className="mk-status" data-s={robot.germany.status}>{STATUS_LABELS[robot.germany.status]}</span>
      </Link></li>;
    })}</ul> : <p className="mk-muted">{job.needs?.reason}</p>}
  </section>;
}
