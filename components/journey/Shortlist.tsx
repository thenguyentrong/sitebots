'use client';

import Link from 'next/link';
import { lbLabel } from '@/lib/journey/labels';
import { checkHref } from '@/lib/journey/stations';
import { reviewForSite } from '@/lib/plan/screen';
import { usePlan } from '@/lib/plan/store';
import type { JourneyContent } from '@/lib/tasks/types';
import { ui } from '@/lib/ui';
import { OpportunityStatus } from './OpportunityResult';
import { Icon } from './Icon';
import { Saved, StationHead } from './StationHead';

export function Shortlist({ content }: { content: JourneyContent }) {
  const plan = usePlan();
  const head = <StationHead title="Your shortlist" lede="Your tasks, their requirements and the evidence still needed. Open a task to compare complete solutions, estimate costs and define a pilot." />;
  if (!plan.ready) return <>{head}<p role="status" className="jp-muted mt-8">Opening your shortlist…</p></>;
  const settings = Object.fromEntries(content.settings.map((s) => [s.id, s]));
  const rows = (plan.workspace?.projects ?? []).map((project) => ({ project, result: reviewForSite(project, content.machineClassFamilies) }));
  if (!rows.length) return <>{head}<div className="jp-body"><section className="jp-card"><div className="jp-card-head"><h2>Nothing on your shortlist yet</h2><p>Browse the task library or describe your own work to start a comparison.</p></div>
    <div className="jp-actions"><Link className={ui.btn} href="/use-cases">Find your work <Icon name="arrow" size={16} /></Link><Link className={ui.btnSecondary} href="/use-cases/custom">Check a task of your own</Link></div>
  </section></div></>;
  return <>{head}<div className="jp-body">
    <section className="jp-card" aria-labelledby="shortlist-title"><div className="jp-card-head"><h2 id="shortlist-title">{rows.length} {rows.length === 1 ? 'task' : 'tasks'} to explore</h2></div>
      <ul className="shortlist">{rows.map(({ project, result }) => {
        const library = project.task.kind === 'library' ? project.task.snapshot : null;
        const setting = library ? settings[library.setting] : null;
        const where = library ? [lbLabel(setting?.lv?.lb), setting?.title.en ?? library.setting].filter(Boolean).join(' ') : 'Your own task';
        return <li key={project.id} data-project={project.id} data-status={result.status}>
          <div className="min-w-0"><p className="jp-small">{where}</p><h3><Link href={checkHref(project)}>{project.title || 'Untitled task'}</Link></h3>
            <p className="jp-muted">Compare: {result.solutionClasses.map((o) => content.solutionClasses[o.id]?.en ?? o.id).join(', ')}.</p></div>
          <OpportunityStatus result={result} /><div className="jp-actions">
            <Link className={ui.btnGhost} href={checkHref(project)}>Check again</Link><button type="button" className={ui.btnGhost} onClick={() => plan.removeProject(project.id)}>Remove</button>
            <Link className={ui.btnSecondary} href="/plan/systems" onClick={() => plan.selectProject(project.id)}>Solutions and cost <Icon name="arrow" size={16} /></Link>
          </div>
        </li>;
      })}</ul>
    </section>
    {rows.length > 1 ? <section className="jp-card jp-split"><div className="jp-card-head"><h2>Which one first?</h2><p>Rate business value and readiness for every task. Use the map to choose what to investigate first.</p></div><Link className={ui.btnSecondary} href="/plan/priorities">Rank them <Icon name="arrow" size={16} /></Link></section> : null}
    <div className="jp-next plan-screen"><Saved /><div className="jp-actions"><Link className={ui.btnGhost} href="/use-cases/custom">Check a task of your own</Link><Link className={ui.btnSecondary} href="/use-cases">Add another task</Link></div></div>
  </div></>;
}
