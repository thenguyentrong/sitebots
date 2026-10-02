import Link from 'next/link';
import { watchUrl, type StepStripData } from '@/lib/workflows/url';
import './workflows.css';

/** A task's steps in one row, for the job map panel: numbered frames joined by a line, each opening
 * the video at that moment. The full sheet is on the task page. */
export function StepStrip({ data, href }: { data: StepStripData; href: string }) {
  return <section className="wf-strip" aria-labelledby="strip-title">
    <div className="wf-strip-head">
      <h3 id="strip-title">How the work is done <span>{data.steps.length} steps</span></h3>
      <Link href={href + '#steps'}>Open the step sheet →</Link>
    </div>
    <ol className="wf-strip-list">{data.steps.map((step, index) => <li key={index} data-last={index === data.steps.length - 1 ? '' : undefined}>
      <a href={watchUrl(data.video.id, step.at)} target="_blank" rel="noopener noreferrer">
        <span className="wf-strip-pic">
          {step.frame ? <img src={step.frame} alt={step.en} width={640} height={360} loading="lazy" decoding="async" /> : null}
          <span className="wf-num" aria-hidden>{index + 1}</span>
        </span>
        <span className="wf-strip-cap"><strong>{step.en}</strong><small lang="de">{step.de}</small></span>
      </a>
    </li>)}</ol>
    <p className="wf-strip-credit">Frames from “{data.video.title}” by {data.video.channel} on YouTube. Select a step to watch it.</p>
  </section>;
}
