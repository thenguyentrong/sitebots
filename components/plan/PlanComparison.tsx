import Link from 'next/link';
import type { PlanResult } from '@/lib/plan/assessment';
import { costResult, euro, type Project } from '@/lib/plan/model';
import { RESULT_LABEL, RESULT_TONE } from './EvidenceDetails';

export function PlanComparison({ project, results = [] }: { project: Project; results?: PlanResult[] }) {
  const criteria = Array.from(new Map(results.flatMap((result) => result.criteria.map((criterion) => [criterion.id, criterion] as const))).values());
  return <section className="card overflow-hidden" aria-label="Comparison for your job">
    <header className="px-5 py-4"><h2 className="text-xl font-semibold">Compare for this job</h2><p className="mt-2 text-sm text-muted">{project.title || 'Your opportunity'} · Confirm the complete configuration and its human responsibilities.</p></header>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[660px] text-left text-sm">
        <thead className="border-y border-edge bg-subtle"><tr><th className="min-w-36 px-5 py-3">Decision criterion</th><th className="min-w-48 px-4 py-3">Current process</th>{project.options.map((option) => <th key={option.id} className="min-w-52 max-w-80 px-4 py-3">{option.href ? <Link className="underline underline-offset-4" href={option.href}>{option.name}</Link> : option.name}</th>)}</tr></thead>
        <tbody className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_th]:px-5 [&_th]:py-3 [&_th]:align-top [&_th]:font-medium [&_tr]:border-b [&_tr]:border-edge">
          <tr><th>Process / package</th><td className="whitespace-pre-wrap">{project.baseline || 'Describe the baseline'}</td>{project.options.map((option) => <td key={option.id} className="whitespace-pre-wrap">{option.package || 'Tools, software and integration to confirm'}</td>)}</tr>
          <tr><th>Human work</th><td>Record in the baseline</td>{project.options.map((option) => <td key={option.id} className="whitespace-pre-wrap">{option.operator || 'Operation, exceptions and fallback to confirm'}</td>)}</tr>
          <tr><th>Screening</th><td>Baseline to measure</td>{project.options.map((option) => {
            const result = results.find((row) => row.id === option.robotId);
            return <td key={option.id}>{result ? result.blocked ? 'Requirement mismatch' : result.open ? result.open + ' criteria need confirmation' : 'Published requirements match; deployment still needs review' : option.solutionReviewId ? 'Source review available; your task fit needs assessment' : 'Needs assessment'}</td>;
          })}</tr>
          {criteria.map((criterion) => <tr key={criterion.id}><th>{criterion.label}</th><td>Baseline to measure</td>{project.options.map((option) => {
            const match = results.find((row) => row.id === option.robotId)?.criteria.find((item) => item.id === criterion.id);
            return <td key={option.id}>{match ? <><span className={'block text-xs font-medium ' + RESULT_TONE[match.status]}>{RESULT_LABEL[match.status]}</span><span className="mt-1 block text-xs">{match.text}</span></> : 'Unconfirmed'}</td>;
          })}</tr>)}
          <tr><th>Initial spend</th><td>Baseline reference</td>{project.options.map((option) => <td key={option.id} className="num">{option.costs.initial !== '' && Number.isFinite(Number(option.costs.initial)) && Number(option.costs.initial) >= 0 ? euro(Number(option.costs.initial)) : 'Not estimated'}</td>)}</tr>
          <tr><th>Net annual cash benefit</th><td>Reference: €0 incremental</td>{project.options.map((option) => { const cost = costResult(option.costs); return <td key={option.id} className="num">{cost.kind === 'ready' ? euro(cost.net) : 'Estimate incomplete'}</td>; })}</tr>
          <tr><th>Simple payback</th><td>Not applicable</td>{project.options.map((option) => { const cost = costResult(option.costs); return <td key={option.id} className="num">{cost.kind === 'ready' ? cost.payback !== null ? cost.payback.toFixed(1) + ' years' : 'No payback' : 'Estimate incomplete'}</td>; })}</tr>
          <tr><th>Supply and support</th><td>Existing arrangements</td>{project.options.map((option) => {
            const result = results.find((row) => row.id === option.robotId);
            return <td key={option.id}>{result ? <Link href={result.href} className="underline underline-offset-4">Check buying details and configuration</Link> : option.solutionReviewId && option.href ? <Link href={option.href} className="underline underline-offset-4">Reviewed buying routes; confirm exact terms</Link> : 'Supplier and regional support to confirm'}</td>;
          })}</tr>
        </tbody>
      </table>
    </div>
    <p className="px-5 py-3 text-xs text-muted">Cost figures are your estimates. Match cells are catalogue evidence, not proof of a complete working application.</p>
  </section>;
}
