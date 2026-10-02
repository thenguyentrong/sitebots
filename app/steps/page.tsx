import Link from 'next/link';
import { loadContent } from '@/lib/content/load';
import { GROUP_LABELS, lbLabel } from '@/lib/journey/labels';
import { publicMetadata } from '@/lib/seo';
import { settingOptions, taskCards } from '@/lib/tasks/cards';
import { loadWorkflows } from '@/lib/workflows/load';
import '@/components/workflows/workflows.css';

export const dynamic = 'force-dynamic';
export const metadata = publicMetadata({
  title: 'How the work is done',
  description: 'Construction tasks step by step, from formwork to tiling, each step shown at its moment in a public video of the work.',
  path: '/steps',
});

const GROUPS = ['site', 'factory', 'yard_logistics', 'operations'] as const;

/** Every task that has a step sheet, by area and trade, with its first frames. */
export default function StepsPage() {
  const content = loadContent();
  const cards = taskCards(content);
  const flows = loadWorkflows();
  const settings = settingOptions(content);
  const shown = cards.filter((card) => flows.has(card.id));
  return <main className="wf-page">
    <header className="wf-page-head">
      <h1>How the work is done</h1>
      <p>Construction tasks step by step, each step shown at its moment in a public video of the work by a maker, trade body or training centre. Select a task for its step sheet, then a step to watch it. {shown.length} of {cards.length} tasks so far.</p>
    </header>
    {GROUPS.map((group) => {
      const trades = settings.filter((setting) => setting.group === group)
        .map((setting) => ({ setting, tasks: shown.filter((card) => card.setting === setting.id) }))
        .filter((trade) => trade.tasks.length);
      if (!trades.length) return null;
      return <section key={group} className="wf-group" aria-labelledby={'steps-' + group}>
        <h2 id={'steps-' + group}>{GROUP_LABELS[group]}</h2>
        {trades.map(({ setting, tasks }) => <div key={setting.id} className="wf-trade">
          <h3>{setting.title.en}<small lang="de">{lbLabel(setting.lv?.lb) ? lbLabel(setting.lv?.lb) + ' · ' : ''}{setting.title.de}</small></h3>
          <ul className="wf-cards">{tasks.map((card) => {
            const flow = flows.get(card.id)!;
            return <li key={card.id}><Link href={'/use-cases/' + card.setting + '/' + card.slug + '#steps'}>
              <span className="wf-thumbs" aria-hidden>{flow.frames.slice(0, 4).map((frame, index) => frame ? <img key={index} src={frame.src} alt="" width={160} height={90} loading="lazy" decoding="async" /> : <span key={index} />)}</span>
              <strong>{card.title.en}</strong>
              <small lang="de">{card.title.de}</small>
              <span className="wf-meta">{flow.steps.length} steps · video by {flow.video.channel}</span>
            </Link></li>;
          })}</ul>
        </div>)}
      </section>;
    })}
  </main>;
}
