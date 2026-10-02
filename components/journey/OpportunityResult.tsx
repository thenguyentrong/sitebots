import { isFocusedSolutionClass } from '@/lib/browse-scope';
import type { OpportunityReview } from '@/lib/assessment/opportunity';
import type { LabelMap } from '@/lib/tasks/types';

export function OpportunityStatus({ result }: { result: OpportunityReview }) {
  return <span className="text-sm font-medium">{result.missingFacts.length ? `${result.missingFacts.length} requirement${result.missingFacts.length === 1 ? '' : 's'} to confirm` : 'Requirements captured'}</span>;
}

/** Capturing requirements and validating a complete solution are separate decisions. */
export function OpportunityResult({ result, solutionClasses }: { result: OpportunityReview; solutionClasses: LabelMap }) {
  return <div className="space-y-5 py-5" data-testid="opportunity-result" data-status={result.status}>
    <div><h3 className="jp-h3"><OpportunityStatus result={result} /></h3><p className="jp-muted mt-2">{result.scopeNote}</p></div>
    <div><h3 className="jp-h3">Approaches to compare</h3><ul className="mt-3 grid gap-3 sm:grid-cols-2">{result.solutionClasses.filter(option => isFocusedSolutionClass(option.id)).map((option) => <li key={option.id} className="rounded-xl border border-edge p-4">
      <strong className="text-sm">{solutionClasses[option.id]?.en ?? option.id}</strong><p className="jp-small mt-1">{option.reason}</p>
      <details className="mt-2 text-sm"><summary className="cursor-pointer">Evidence to request</summary><ul className="mt-2 list-disc space-y-2 pl-4 text-muted">{option.evidenceQuestions.map((q) => <li key={q}>{q}</li>)}</ul></details>
    </li>)}</ul></div>
    <details className="jp-details"><summary>Requirements and their sources ({result.requirements.length - result.missingFacts.length} of {result.requirements.length} provided)</summary>
      <dl className="divide-y divide-edge">{result.requirements.map((item) => <div key={item.key} className="py-3" data-requirement={item.key} data-status={item.status}>
        <dt className="font-medium text-sm">{item.label}</dt><dd className="text-sm mt-1">{item.value} <span className="text-muted">· {item.origin === 'visitor' ? 'Your answer' : item.origin === 'record' ? 'Task record' : item.origin === 'context' ? 'Company context' : 'Unknown'}{item.confidence ? ` · ${item.confidence}` : ''}</span></dd>
        {item.note ? <dd className="jp-small mt-1">{item.note}</dd> : null}
        {item.evidenceUrl ? <dd><a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="jp-link text-sm">Source</a></dd> : null}
        <dd className="jp-small mt-1">{item.question}</dd>
      </div>)}</dl>
    </details>
  </div>;
}
