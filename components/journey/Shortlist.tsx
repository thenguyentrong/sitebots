'use client';

import Link from 'next/link';
import { lbLabel } from '@/lib/journey/labels';
import { checkHref } from '@/lib/journey/stations';
import { answeredKeys, screenForSite } from '@/lib/plan/screen';
import { usePlan } from '@/lib/plan/store';
import { formatMessage } from '@/lib/screen/messages';
import type { JourneyContent } from '@/lib/tasks/types';
import { ui } from '@/lib/ui';
import { VerdictLine, mainReason } from './CheckResult';
import { Icon } from './Icon';
import { Saved, StationHead } from './StationHead';

const ORDER = { candidate: 0, marginal: 1, unscreened: 2, ruled_out: 3 } as const;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Step 3 starts here: every checked task with its verdict for the visitor's site, best first, and the way into the decision for each. */
export function Shortlist({ content }: { content: JourneyContent }) {
  const plan = usePlan();
  const head = <StationHead title="Your shortlist" lede="Every task you checked, with its verdict for your site. Open one to compare complete solutions, a rough cost and what a pilot must prove." />;
  if (!plan.ready) return <>{head}<p role="status" className="jp-muted mt-8">Opening your shortlist…</p></>;
  const settings = Object.fromEntries(content.settings.map((s) => [s.id, s]));
  const machines = Object.fromEntries(content.machineClasses.map((m) => [m.id, m.title.en]));
  const rows = (plan.workspace?.projects ?? [])
    .map((project, index) => ({ project, index, result: screenForSite(project, content.machineClassFamilies) }))
    .sort((a, b) => ORDER[a.result.verdict] - ORDER[b.result.verdict] || a.index - b.index);
  if (!rows.length) return <>{head}<div className="jp-body">
    <section className="jp-card"><div className="jp-card-head"><h2>Nothing on your shortlist yet</h2><p>Find your trade, open a task, check it for your site and add it here.</p></div>
      <div className="jp-actions"><Link className={ui.btn} href="/use-cases">Find your work <Icon name="arrow" size={16} /></Link><Link className={ui.btnSecondary} href="/use-cases/custom">Check a task of your own</Link></div>
    </section>
  </div></>;
  const worth = rows.filter((r) => r.result.verdict === 'candidate' || r.result.verdict === 'marginal').length;
  return <>
    {head}
    <div className="jp-body">
      <section className="jp-card" aria-labelledby="shortlist-title">
        <div className="jp-card-head"><h2 id="shortlist-title">{plural(rows.length, 'task')}{worth ? `, ${worth} worth pursuing` : ''}</h2></div>
        <ul className="shortlist">{rows.map(({ project, result }) => {
          const library = project.task.kind === 'library' ? project.task.snapshot : null;
          const setting = library ? settings[library.setting] : null;
          const where = library ? [lbLabel(setting?.lv?.lb), setting?.title.en ?? library.setting].filter(Boolean).join(' ') : 'Your own task';
          const answers = library ? answeredKeys(project.factOverrides).length : 0;
          const href = checkHref(project);
          return <li key={project.id} data-project={project.id} data-verdict={result.verdict}>
            <div className="min-w-0">
              <p className="jp-small">{where}{answers ? `, ${plural(answers, 'answer')} for your site` : ''}</p>
              <h3><Link href={href}>{project.title || 'Untitled task'}</Link></h3>
              <p className="jp-muted">{mainReason(result, (id) => machines[id] ?? id)}</p>
              {result.verdict === 'ruled_out' ? <p className="shortlist-better"><Icon name="better" size={16} /><span>{formatMessage(result.better_answer.message)}</span></p> : null}
            </div>
            <VerdictLine verdict={result.verdict} />
            <div className="jp-actions">
              <Link className={ui.btnGhost} href={href}>Check again</Link>
              <button type="button" className={ui.btnGhost} onClick={() => plan.removeProject(project.id)}>Remove</button>
              <Link className={ui.btnSecondary} href="/plan/systems" onClick={() => plan.selectProject(project.id)}>Solutions and cost <Icon name="arrow" size={16} /></Link>
            </div>
          </li>;
        })}</ul>
      </section>
      {rows.length > 1 ? <section className="jp-card jp-split"><div className="jp-card-head"><h2>Which one first?</h2><p>Rate business value against readiness for each task. The map shows which one to pilot first.</p></div><Link className={ui.btnSecondary} href="/plan/priorities">Rank them <Icon name="arrow" size={16} /></Link></section> : null}
      <div className="jp-next plan-screen"><Saved /><div className="jp-actions"><Link className={ui.btnGhost} href="/use-cases/custom">Check a task of your own</Link><Link className={ui.btnSecondary} href="/use-cases">Add another task</Link></div></div>
    </div>
  </>;
}
