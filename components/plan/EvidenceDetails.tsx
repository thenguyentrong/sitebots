import type { PlanResult } from '@/lib/plan/assessment';
import { ui } from '@/lib/ui';

export const RESULT_LABEL = { pass: 'Published match', partial: 'Needs review', fail: 'Mismatch', unknown: 'Unconfirmed' };
export const RESULT_TONE = { pass: 'text-trust-verified', partial: 'text-trust-reported', fail: 'text-destructive', unknown: 'text-muted' };
export function EvidenceDetails({ result }: { result: PlanResult }) {
  return <details className="mt-4 text-sm">
    <summary className="cursor-pointer font-medium">Requirements and sources</summary>
    <ul className="mt-3 space-y-3">{result.criteria.map((criterion) => <li key={criterion.id}>
      <span className={RESULT_TONE[criterion.status] + ' text-xs font-medium'}>{RESULT_LABEL[criterion.status]}</span>
      <p><span className="font-medium">{criterion.label}: </span>{criterion.text}</p>
    </li>)}</ul>
    <p className="mt-4 text-xs text-muted">Published values screen the robot. Tooling, workflow and performance for your job still need confirmation.</p>
    {result.sources.length ? <ul className="mt-3 space-y-2">{result.sources.map((source, index) => <li key={source.label + index} className="break-words text-xs"><a className={ui.link} href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a><span className="text-muted"> · {source.trust} · {source.observedAt.slice(0, 10)}</span></li>)}</ul> : <p className="mt-2 text-xs text-muted">No supporting source links recorded for these requirements.</p>}
  </details>;
}
