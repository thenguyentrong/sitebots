import type { ReactNode } from 'react';
import type { WorkflowWithFrames } from '@/lib/workflows/load';
import { watchUrl } from '@/lib/workflows/url';
import './workflows.css';

const COLUMNS = 4;

/** Where step `index` sits in the snake: rows run left to right, then right to left. */
function place(index: number, total: number) {
  const row = Math.floor(index / COLUMNS);
  const inRow = index % COLUMNS;
  const forward = row % 2 === 0;
  const column = forward ? inRow + 1 : COLUMNS - inRow;
  const lastInRow = inRow === COLUMNS - 1;
  const last = index === total - 1;
  // A full row hands over to the next one with a turn on its far side; the last step ends in an arrow.
  const turn = !last && lastInRow ? (forward ? 'right' : 'left') : undefined;
  const end = last ? (forward ? 'right' : 'left') : undefined;
  return { row: row + 1, column, turn, end };
}

/** A task as the steps a crew works through, each with the video frame where it is seen, or a
 * labelled illustration where no public video shows the work. */
export function StepFlow({ workflow }: { workflow: WorkflowWithFrames }) {
  const { video, illustration, steps, frames } = workflow;
  return <section className="jp-section" aria-labelledby="steps" id="steps">
    <div className="jp-section-head">
      <h2 id="steps">How the work is done</h2>
      <p>{video ? steps.length + ' steps, each shown at its moment in a video by ' + video.channel + '. Select a step to watch it.' : steps.length + ' steps, drawn as AI illustrations. ' + illustration!.reason.en}</p>
    </div>
    <ol className="wf-flow">{steps.map((step, index) => {
      const spot = place(index, steps.length);
      const frame = frames[index];
      const body: ReactNode = <>
        <span className="wf-pic">
          {frame ? <img src={frame.src} width={frame.width} height={frame.height} alt={step.title.en + (video ? '' : ' (AI illustration)')} loading="lazy" decoding="async" /> : null}
          <span className="wf-num" aria-hidden>{index + 1}</span>
          {video ? null : <span className="wf-ai">AI illustration</span>}
        </span>
        <span className="wf-caption"><strong>{step.title.en}</strong><small lang="de">{step.title.de}</small></span>
      </>;
      return <li key={index} className="wf-step" style={{ gridRow: spot.row, gridColumn: spot.column }} data-turn={spot.turn} data-end={spot.end} data-first={index === 0 ? '' : undefined}>
        {video && step.at !== undefined ? <a className="wf-card" href={watchUrl(video.id, step.at)} target="_blank" rel="noopener noreferrer">{body}</a> : <span className="wf-card">{body}</span>}
      </li>;
    })}</ol>
    {workflow.note ? <p className="jp-small mt-4">{workflow.note.en}</p> : null}
    {video
      ? <p className="jp-small mt-2">Pictures: frames from <a className="jp-link" href={'https://www.youtube.com/watch?v=' + video.id} target="_blank" rel="noopener noreferrer">“{video.title}”</a> by {video.channelUrl ? <a className="jp-link" href={video.channelUrl} target="_blank" rel="noopener noreferrer">{video.channel}</a> : video.channel} on YouTube, checked {video.checkedAt}.</p>
      : <p className="jp-small mt-2">Pictures: AI illustrations made with {illustration!.generator} ({illustration!.model}) on {illustration!.generatedAt}. They show the steps, not a real site or plant.</p>}
  </section>;
}
