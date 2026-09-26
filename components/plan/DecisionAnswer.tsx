import Link from 'next/link';
import type { PlanResult } from '@/lib/plan/assessment';
import { costResult, euro, type Project } from '@/lib/plan/model';
import { jobById } from '@/lib/plan/jobs';
import { alternativesFor } from '@/lib/plan/intake';

export function DecisionAnswer({ project, result, action }: { project: Project; result?: PlanResult; action: string }) {
  const option = project.options.find((item) => item.id === project.selectedOptionId) ?? project.options[0];
  const initial = option?.costs.initial.trim();
  const validInitial = Boolean(initial) && Number.isFinite(Number(initial)) && Number(initial) >= 0;
  const costs = option ? costResult(option.costs) : undefined;
  return <section className="finder-answer" aria-label="Your project answer">
    <p className="plan-kicker">Your answer so far</p><h2>A candidate, a budget, a first test.</h2>
    <div className="finder-answer-grid">
      <div><span>What could we use?</span><h3>{option?.name || 'Choose a candidate'}</h3><p>{result?.blocked ? 'A recorded requirement does not match. Resolve this before proceeding.' : option ? 'Your selected option to investigate. Validate the complete task and configuration.' : 'Return to Solutions to shortlist a robot or another approach.'}</p><p className="text-xs">Compare with: {alternativesFor(project)}.</p>{option?.href ? <Link href={option.href}>Robot & buying details ↗</Link> : null}</div>
      <div><span>What could it cost?</span><h3>{validInitial ? euro(Number(initial)) : 'Full setup: quote needed'}</h3><p>{validInitial ? 'Your estimated initial spend, including the complete setup.' : 'Equipment, tooling, integration and running costs still need an estimate.'}</p><p>{costs?.kind === 'ready' ? 'Simple payback: ' + (costs.payback !== null ? costs.payback.toFixed(1) + ' years under your assumptions.' : 'none under your assumptions.') : 'Payback stays open until the cost and workload inputs are complete.'}</p></div>
      <div><span>Where do we start?</span><h3>One representative task</h3><p>{project.pilot.scope || jobById(project.jobId).outcome}</p><p className="text-xs">{project.pilot.success || 'Agree measures before a trial: ' + jobById(project.jobId).measures.join(', ') + '.'}</p></div>
    </div>
    <div className="finder-answer-next"><strong>Next action</strong><p>{action}</p></div>
  </section>;
}
